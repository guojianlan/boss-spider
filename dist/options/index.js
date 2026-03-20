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

  // src/options/index.ts
  var currentSettings = null;
  var statusText = "";
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
  function render() {
    const app = document.getElementById("app");
    if (!app || !currentSettings) {
      return;
    }
    const debugEnabled = currentSettings.debug?.enabled ?? false;
    app.innerHTML = `
    <div class="panel">
      <h1>Boss Spider \u8BBE\u7F6E</h1>
      <p>\u5F53\u524D\u652F\u6301 BOSS \u5019\u9009\u4EBA\u5217\u8868\u9875\u4E0E\u804C\u4F4D\u5217\u8868\u9875\u3002\u8BF7\u586B\u5199 baseUrl\u3001apiKey \u548C model\uFF0C\u8FD0\u884C\u65F6\u4F1A\u59CB\u7EC8\u9644\u5E26\u5F53\u524D\u9875\u9762\u622A\u56FE\u53D1\u9001\u7ED9\u6A21\u578B\u3002</p>
    </div>

    <div class="panel">
      <h2>Provider</h2>
      <div class="field">
        <label for="baseUrl">Base URL</label>
        <input id="baseUrl" value="${escapeHtml(currentSettings.provider.baseUrl)}" placeholder="\u4F8B\u5982\uFF1Ahttps://api.openai.com" />
      </div>
      <div class="field">
        <label for="apiKey">API Key</label>
        <input id="apiKey" type="password" value="${escapeHtml(currentSettings.provider.apiKey)}" placeholder="sk-..." />
      </div>
      <div class="field">
        <label for="model">Model</label>
        <input id="model" value="${escapeHtml(currentSettings.provider.model)}" placeholder="\u4F8B\u5982\uFF1Agpt-4.1-mini" />
      </div>
    </div>

    <div class="panel">
      <h2>\u9ED8\u8BA4\u8FD0\u884C\u53C2\u6570</h2>
      <div class="grid">
        <div class="field">
          <label for="maxItems">\u9ED8\u8BA4\u6700\u5927\u5904\u7406\u6761\u6570</label>
          <input id="maxItems" type="number" min="1" max="500" value="${currentSettings.defaults.maxItems}" />
        </div>
        <div class="field">
          <label for="delayMs">\u9ED8\u8BA4\u5EF6\u8FDF(ms)</label>
          <input id="delayMs" type="number" min="300" max="20000" value="${currentSettings.defaults.delayMs}" />
        </div>
      </div>
      <div class="field">
        <label for="defaultNotes">\u9ED8\u8BA4\u8865\u5145\u8BF4\u660E</label>
        <textarea id="defaultNotes" rows="5" placeholder="\u4F8B\u5982\uFF1A\u4F18\u5148\u6536\u85CF\u8FD1 3 \u5E74\u6301\u7EED\u505A\u540E\u7AEF\u7814\u53D1\u7684\u4EBA\u9009">${escapeHtml(currentSettings.defaults.notesForAI)}</textarea>
      </div>
      <div class="field">
        <label><input id="skipFavorited" type="checkbox" ${currentSettings.defaults.skipIfAlreadyFavorited ? "checked" : ""} /> \u5DF2\u6536\u85CF\u81EA\u52A8\u8DF3\u8FC7</label>
      </div>
      <div class="field">
        <label><input id="debugMode" type="checkbox" ${debugEnabled ? "checked" : ""} /> \u5F00\u542F\u9875\u9762\u8C03\u8BD5\u6A21\u5F0F</label>
        <div class="muted" style="margin-top:6px;">\u5F00\u542F\u540E\uFF0C\u652F\u6301\u9875\u9762\u5DE6\u4E0B\u89D2\u4F1A\u51FA\u73B0\u201C\u5BFC\u51FA DOM \u5FEB\u7167\u201D\u6309\u94AE\uFF0C\u53EF\u628A\u9875\u9762\u5143\u7D20\u6811\u5BFC\u51FA\u6210 JSON \u4F9B\u6392\u67E5\u9009\u62E9\u5668\u3002</div>
      </div>
      <div>
        <button id="save-btn">\u4FDD\u5B58\u8BBE\u7F6E</button>
        ${statusText ? `<span class="status">${escapeHtml(statusText)}</span>` : ""}
      </div>
      <div class="muted" style="margin-top:10px;">\u63D0\u793A\uFF1A\u63D2\u4EF6\u4F1A\u628A\u5F53\u524D\u652F\u6301\u9875\u9762\u7684\u622A\u56FE\u548C\u63D0\u53D6\u51FA\u7684\u6587\u672C\u4E00\u5E76\u53D1\u9001\u5230\u4F60\u914D\u7F6E\u7684\u6A21\u578B\u670D\u52A1\uFF0C\u8BF7\u53EA\u5728\u4F60\u8BA4\u53EF\u7684\u73AF\u5883\u4E0B\u4F7F\u7528\u3002</div>
    </div>
  `;
    document.getElementById("save-btn")?.addEventListener("click", () => {
      void save();
    });
  }
  function getInputValue(id) {
    return document.getElementById(id)?.value ?? "";
  }
  async function save() {
    if (!currentSettings) {
      return;
    }
    currentSettings = {
      ...normalizeSettings(currentSettings),
      provider: {
        baseUrl: getInputValue("baseUrl").trim(),
        apiKey: getInputValue("apiKey").trim(),
        model: getInputValue("model").trim() || "gpt-4.1-mini"
      },
      defaults: {
        ...currentSettings.defaults,
        maxItems: Math.max(1, Math.min(500, Number(getInputValue("maxItems")) || 20)),
        delayMs: Math.max(300, Math.min(2e4, Number(getInputValue("delayMs")) || 1200)),
        notesForAI: getInputValue("defaultNotes").trim(),
        skipIfAlreadyFavorited: document.getElementById("skipFavorited")?.checked ?? true
      },
      debug: {
        enabled: document.getElementById("debugMode")?.checked ?? false
      }
    };
    try {
      await sendToBackground({ type: "SAVE_SETTINGS", settings: currentSettings });
      statusText = "\u4FDD\u5B58\u6210\u529F";
    } catch (error) {
      statusText = error instanceof Error ? error.message : String(error);
    }
    render();
  }
  async function bootstrap() {
    const { settings } = await sendToBackground({ type: "GET_SETTINGS" });
    currentSettings = normalizeSettings(settings);
    render();
  }
  void bootstrap();
  startExtensionPageDevWatcher("options");
})();
