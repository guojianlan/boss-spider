"use strict";
(() => {
  // src/dev/reload.ts
  var DEV_POLL_INTERVAL_MS = 1e3;
  var startedWatchers = /* @__PURE__ */ new Set();
  async function fetchBuildInfo() {
    if (true) {
      return null;
    }
    const response = await fetch(`${""}/__boss_spider__/build-info?t=${Date.now()}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`dev server unavailable: ${response.status}`);
    }
    return await response.json();
  }
  function startWatcher(id, onChange) {
    if (true) {
      return;
    }
    startedWatchers.add(id);
    let lastVersion = null;
    let inFlight = false;
    globalThis.setInterval(() => {
      if (inFlight) {
        return;
      }
      inFlight = true;
      void fetchBuildInfo().then(async (buildInfo) => {
        if (!buildInfo) {
          return;
        }
        if (lastVersion === null) {
          lastVersion = buildInfo.version;
          return;
        }
        if (buildInfo.version === lastVersion) {
          return;
        }
        lastVersion = buildInfo.version;
        await onChange(buildInfo);
      }).catch(() => {
      }).finally(() => {
        inFlight = false;
      });
    }, DEV_POLL_INTERVAL_MS);
  }
  function startExtensionPageDevWatcher(pageId) {
    startWatcher(`page:${pageId}`, () => {
      globalThis.setTimeout(() => {
        location.reload();
      }, 1200);
      const request = { type: "DEV_RELOAD_EXTENSION" };
      void chrome.runtime.sendMessage(request).catch(() => {
      });
    });
  }

  // src/shared/schema/runPlan.ts
  function parseKeywordList(value) {
    return (value ?? "").split(/[\n,，]/).map((item) => item.trim()).filter(Boolean);
  }
  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function normalizeRunPlan(input) {
    const maxItemsValue = Number(input.maxItems ?? 20);
    const delayMsValue = Number(input.delayMs ?? 1200);
    return {
      keywordsMustMatch: parseKeywordList(input.keywordsMustMatch),
      keywordsOptional: parseKeywordList(input.keywordsOptional),
      keywordsExclude: parseKeywordList(input.keywordsExclude),
      notesForAI: (input.notesForAI ?? "").trim(),
      maxItems: Number.isFinite(maxItemsValue) ? clampNumber(Math.round(maxItemsValue), 1, 500) : 20,
      delayMs: Number.isFinite(delayMsValue) ? clampNumber(Math.round(delayMsValue), 300, 2e4) : 1200,
      skipIfAlreadyFavorited: input.skipIfAlreadyFavorited ?? true,
      screenshotMode: "always"
    };
  }

  // src/shared/storage.ts
  var defaultSettings = {
    provider: {
      baseUrl: "",
      apiKey: "",
      model: "gpt-4.1-mini"
    },
    defaults: {
      keywordsMustMatch: "",
      keywordsOptional: "",
      keywordsExclude: "",
      notesForAI: "",
      maxItems: 20,
      delayMs: 1200,
      skipIfAlreadyFavorited: true
    },
    debug: {
      enabled: false
    }
  };

  // src/popup/index.ts
  var state = {
    pageStatus: null,
    settings: defaultSettings,
    runtime: null,
    summary: null,
    feedback: "",
    feedbackError: false
  };
  var runtimePollingTimer = null;
  function normalizeSettings(settings) {
    return {
      provider: {
        ...defaultSettings.provider,
        ...settings?.provider ?? {}
      },
      defaults: {
        ...defaultSettings.defaults,
        ...settings?.defaults ?? {}
      },
      debug: {
        ...defaultSettings.debug,
        ...settings?.debug ?? {}
      }
    };
  }
  async function sendToBackground(request) {
    const response = await chrome.runtime.sendMessage(request);
    if (!response.ok) {
      throw new Error(response.error);
    }
    return response;
  }
  function escapeHtml(value) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }
  function ensureRuntimePolling() {
    if (runtimePollingTimer !== null) {
      return;
    }
    runtimePollingTimer = window.setInterval(() => {
      void refreshRuntime(false);
    }, 1500);
  }
  function render() {
    const app = document.getElementById("app");
    if (!app) {
      return;
    }
    const pageStatus = state.pageStatus;
    const runtime = state.runtime;
    const summary = state.summary;
    const defaults = state.settings.defaults;
    const debugEnabled = state.settings.debug?.enabled ?? false;
    const statusClass = pageStatus?.supported ? "status" : "status error";
    const statusText = pageStatus ? pageStatus.supported ? `\u9875\u9762\u53EF\u8FD0\u884C\uFF08${pageStatus.modeLabel}\uFF09\uFF0C\u5F53\u524D\u5DF2\u52A0\u8F7D ${pageStatus.candidateCount} \u6761\u7ED3\u679C${pageStatus.dynamicList ? "\uFF0C\u8FD0\u884C\u65F6\u4F1A\u6309\u201C\u6700\u591A\u5904\u7406\u6761\u6570\u201D\u7EE7\u7EED\u6EDA\u52A8\u52A0\u8F7D" : ""}` : pageStatus.reason ?? "\u5F53\u524D\u9875\u9762\u6682\u4E0D\u652F\u6301" : "\u6B63\u5728\u68C0\u67E5\u5F53\u524D\u9875\u9762";
    app.innerHTML = `
    <div class="panel">
      <h1>Boss Spider</h1>
      <div class="${statusClass}">${escapeHtml(statusText)}</div>
      <div class="hint" style="margin-top:10px;">\u8BF7\u5148\u5728 BOSS \u76F4\u8058\u652F\u6301\u7684\u5217\u8868\u9875\u624B\u52A8\u7B5B\u9009\u540E\u518D\u542F\u52A8\u4EFB\u52A1\u3002</div>
      <div style="margin-top:10px;"><span class="link" id="open-options">\u6253\u5F00\u8BBE\u7F6E\u9875</span></div>
    </div>

    <div class="panel">
      <h2>\u8C03\u8BD5</h2>
      <div class="field">
        <label><input id="debugMode" type="checkbox" ${debugEnabled ? "checked" : ""} /> \u5F00\u542F\u9875\u9762\u8C03\u8BD5\u6A21\u5F0F</label>
        <div class="hint" style="margin-top:6px;">\u5F00\u542F\u540E\u4F1A\u5728\u5F53\u524D\u9875\u9762\u5DE6\u4E0B\u89D2\u6CE8\u5165\u201C\u5BFC\u51FA DOM \u5FEB\u7167\u201D\u6309\u94AE\uFF0C\u5BFC\u51FA\u7684 JSON \u53EF\u4EE5\u53D1\u7ED9\u6211\u5B9A\u4F4D\u5217\u8868\u548C\u8BE6\u60C5\u533A\u57DF\u3002</div>
      </div>
      <div class="actions">
        <button class="secondary" id="save-debug-btn">\u4FDD\u5B58\u8C03\u8BD5\u8BBE\u7F6E</button>
      </div>
    </div>

    <div class="panel">
      <h2>\u8FD0\u884C\u89C4\u5219</h2>
      <div class="field">
        <label for="must">\u5FC5\u987B\u547D\u4E2D\u5173\u952E\u8BCD</label>
        <textarea id="must" placeholder="\u4F8B\u5982\uFF1AJava, Spring Boot, Redis">${escapeHtml(defaults.keywordsMustMatch)}</textarea>
      </div>
      <div class="field">
        <label for="optional">\u52A0\u5206\u5173\u952E\u8BCD</label>
        <textarea id="optional" placeholder="\u4F8B\u5982\uFF1AKafka, Docker, \u5FAE\u670D\u52A1">${escapeHtml(defaults.keywordsOptional)}</textarea>
      </div>
      <div class="field">
        <label for="exclude">\u6392\u9664\u5173\u952E\u8BCD</label>
        <textarea id="exclude" placeholder="\u4F8B\u5982\uFF1A\u5916\u5305, \u8F6C\u5C97">${escapeHtml(defaults.keywordsExclude)}</textarea>
      </div>
      <div class="field">
        <label for="notes">\u8865\u5145\u7ED9 AI \u7684\u8BF4\u660E</label>
        <textarea id="notes" placeholder="\u4F8B\u5982\uFF1A\u66F4\u770B\u91CD\u8FD1 3 \u5E74 Java \u540E\u7AEF\u9879\u76EE\u7ECF\u9A8C">${escapeHtml(defaults.notesForAI)}</textarea>
      </div>
      <div class="grid">
        <div class="field">
          <label for="maxItems">\u6700\u591A\u5904\u7406\u6761\u6570</label>
          <input id="maxItems" type="number" min="1" max="500" value="${defaults.maxItems}" />
        </div>
        <div class="field">
          <label for="delayMs">\u6BCF\u6761\u5EF6\u8FDF(ms)</label>
          <input id="delayMs" type="number" min="300" max="20000" value="${defaults.delayMs}" />
        </div>
      </div>
      <div class="field">
        <label><input id="skipFavorited" type="checkbox" ${defaults.skipIfAlreadyFavorited ? "checked" : ""} /> \u5DF2\u6536\u85CF\u81EA\u52A8\u8DF3\u8FC7</label>
      </div>
      <div class="actions">
        <button class="primary" id="start-btn" ${pageStatus?.supported ? "" : "disabled"}>\u8FD0\u884C AI \u4EE3\u7406</button>
        <button class="secondary" id="stop-btn">\u505C\u6B62</button>
      </div>
      ${state.feedback ? `<div class="hint" style="margin-top:10px;color:${state.feedbackError ? "#b91c1c" : "#047857"};">${escapeHtml(state.feedback)}</div>` : ""}
    </div>

    <div class="panel">
      <h2>\u8FD0\u884C\u72B6\u6001</h2>
      <div class="summary-row">\u72B6\u6001\uFF1A${escapeHtml(runtime?.message ?? "\u6682\u65E0\u8FD0\u884C\u4E2D\u7684\u4EFB\u52A1")}</div>
      <div class="summary-row">\u8FDB\u5EA6\uFF1A${runtime ? `${runtime.processed}/${runtime.total}` : "-"}</div>
      <div class="summary-row">\u6536\u85CF\uFF1A${runtime?.favorited ?? 0}</div>
      <div class="summary-row">\u5F53\u524D\uFF1A${escapeHtml(runtime?.currentLabel ?? "-")}</div>
    </div>

    <div class="panel">
      <h2>\u6700\u8FD1\u4E00\u6B21\u7ED3\u679C</h2>
      <div class="summary-row">\u5904\u7406\uFF1A${summary?.processed ?? 0}</div>
      <div class="summary-row">\u6536\u85CF\uFF1A${summary?.favorited ?? 0}</div>
      <div class="summary-row">\u8DF3\u8FC7\uFF1A${summary ? summary.skipped + summary.alreadyFavorited : 0}</div>
      <div class="summary-row">\u5F02\u5E38\uFF1A${summary?.errors ?? 0}</div>
    </div>
  `;
    document.getElementById("open-options")?.addEventListener("click", () => {
      void chrome.runtime.openOptionsPage();
    });
    document.getElementById("save-debug-btn")?.addEventListener("click", () => {
      void saveDebugSettings();
    });
    document.getElementById("start-btn")?.addEventListener("click", () => {
      void startRun();
    });
    document.getElementById("stop-btn")?.addEventListener("click", () => {
      void stopRun();
    });
  }
  function getInputValue(id) {
    return document.getElementById(id)?.value ?? "";
  }
  async function startRun() {
    try {
      state.settings = normalizeSettings(state.settings);
      if (!state.settings.provider.baseUrl.trim() || !state.settings.provider.apiKey.trim()) {
        throw new Error("\u8BF7\u5148\u6253\u5F00\u8BBE\u7F6E\u9875\u914D\u7F6E baseUrl \u548C apiKey");
      }
      const plan = normalizeRunPlan({
        keywordsMustMatch: getInputValue("must"),
        keywordsOptional: getInputValue("optional"),
        keywordsExclude: getInputValue("exclude"),
        notesForAI: getInputValue("notes"),
        maxItems: getInputValue("maxItems"),
        delayMs: getInputValue("delayMs"),
        skipIfAlreadyFavorited: document.getElementById("skipFavorited")?.checked ?? true
      });
      state.settings = {
        ...normalizeSettings(state.settings),
        defaults: {
          ...state.settings.defaults,
          keywordsMustMatch: getInputValue("must"),
          keywordsOptional: getInputValue("optional"),
          keywordsExclude: getInputValue("exclude"),
          notesForAI: getInputValue("notes"),
          maxItems: plan.maxItems,
          delayMs: plan.delayMs,
          skipIfAlreadyFavorited: plan.skipIfAlreadyFavorited
        }
      };
      await sendToBackground({ type: "SAVE_SETTINGS", settings: state.settings });
      await sendToBackground({ type: "START_RUN", plan });
      state.feedback = "\u4EFB\u52A1\u5DF2\u5F00\u59CB\uFF0C\u8BF7\u4FDD\u6301\u5F53\u524D\u9875\u9762\u53EF\u89C1\u3002";
      state.feedbackError = false;
      await refreshRuntime(false);
    } catch (error) {
      state.feedback = error instanceof Error ? error.message : String(error);
      state.feedbackError = true;
    }
    render();
  }
  async function saveDebugSettings() {
    try {
      state.settings = normalizeSettings(state.settings);
      state.settings = {
        ...state.settings,
        debug: {
          enabled: document.getElementById("debugMode")?.checked ?? false
        }
      };
      await sendToBackground({ type: "SAVE_SETTINGS", settings: state.settings });
      state.feedback = state.settings.debug.enabled ? "\u8C03\u8BD5\u6A21\u5F0F\u5DF2\u5F00\u542F\uFF0C\u5F53\u524D\u9875\u9762\u5DE6\u4E0B\u89D2\u4F1A\u51FA\u73B0\u5BFC\u51FA\u6309\u94AE\u3002" : "\u8C03\u8BD5\u6A21\u5F0F\u5DF2\u5173\u95ED\u3002";
      state.feedbackError = false;
    } catch (error) {
      state.feedback = error instanceof Error ? error.message : String(error);
      state.feedbackError = true;
    }
    render();
  }
  async function stopRun() {
    try {
      await sendToBackground({ type: "STOP_RUN" });
      state.feedback = "\u5DF2\u8BF7\u6C42\u505C\u6B62\u4EFB\u52A1\u3002";
      state.feedbackError = false;
      await refreshRuntime(false);
    } catch (error) {
      state.feedback = error instanceof Error ? error.message : String(error);
      state.feedbackError = true;
    }
    render();
  }
  async function refreshRuntime(shouldRender = true) {
    const runtimeResponse = await sendToBackground({ type: "GET_RUNTIME_STATUS" });
    const summaryResponse = await sendToBackground({ type: "GET_LAST_SUMMARY" });
    state.runtime = runtimeResponse.runtime;
    state.summary = summaryResponse.summary;
    if (shouldRender) {
      render();
    }
  }
  async function bootstrap() {
    try {
      const [{ pageStatus }, { settings }] = await Promise.all([
        sendToBackground({ type: "GET_PAGE_STATUS" }),
        sendToBackground({ type: "GET_SETTINGS" })
      ]);
      state.pageStatus = pageStatus;
      state.settings = normalizeSettings(settings);
      await refreshRuntime(false);
      ensureRuntimePolling();
    } catch (error) {
      state.feedback = error instanceof Error ? error.message : String(error);
      state.feedbackError = true;
    }
    render();
  }
  void bootstrap();
  startExtensionPageDevWatcher("popup");
})();
