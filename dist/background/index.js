"use strict";
(() => {
  // src/ai/prompts/decisionPrompt.ts
  function section(title, content) {
    return `${title}
${content.trim() || "\u65E0"}
`;
  }
  function createDecisionPrompt(plan, evidence) {
    return [
      "\u4F60\u662F\u4E00\u4E2A\u804C\u4F4D\u7B5B\u9009\u52A9\u624B\u3002\u4F60\u53EA\u80FD\u6839\u636E\u7528\u6237\u7ED9\u5B9A\u7684\u89C4\u5219\uFF0C\u5BF9\u5F53\u524D\u804C\u4F4D\u8F93\u51FA\u662F\u5426\u5E94\u8BE5\u6536\u85CF\u3002",
      "\u53EA\u80FD\u8FD4\u56DE JSON\uFF0C\u4E0D\u8981\u8F93\u51FA Markdown\uFF0C\u4E0D\u8981\u8F93\u51FA\u989D\u5916\u8BF4\u660E\u3002",
      '\u8F93\u51FA\u683C\u5F0F\u5FC5\u987B\u662F\uFF1A{"decision":"favorite|skip|unsure","reason":"...","matched":["..."],"missing":["..."],"confidence":0.0}',
      "\u5982\u679C\u4FE1\u606F\u4E0D\u8DB3\uFF0C\u8FD4\u56DE unsure\u3002",
      section("\u5FC5\u987B\u547D\u4E2D\u7684\u5173\u952E\u8BCD\uFF1A", plan.keywordsMustMatch.join("\uFF0C")),
      section("\u52A0\u5206\u5173\u952E\u8BCD\uFF1A", plan.keywordsOptional.join("\uFF0C")),
      section("\u6392\u9664\u5173\u952E\u8BCD\uFF1A", plan.keywordsExclude.join("\uFF0C")),
      section("\u7528\u6237\u8865\u5145\u8BF4\u660E\uFF1A", plan.notesForAI),
      section("\u5DE6\u4FA7\u6458\u8981\uFF1A", evidence.summaryText),
      section("\u53F3\u4FA7\u8BE6\u60C5\u6587\u672C\uFF1A", evidence.detailText),
      section("\u9875\u9762\u6807\u7B7E\uFF1A", evidence.tags.join("\uFF0C")),
      `\u5F53\u524D\u804C\u4F4D/\u516C\u53F8\u6458\u8981\uFF1A${evidence.label}`,
      `\u5F53\u524D\u804C\u4F4D\u662F\u5426\u5DF2\u6536\u85CF\uFF1A${evidence.alreadyFavorited ? "\u662F" : "\u5426"}`,
      "\u8BF7\u7ED3\u5408\u804C\u4F4D\u8981\u6C42\u3001\u516C\u53F8\u4FE1\u606F\u3001\u884C\u4E1A/\u9636\u6BB5/\u89C4\u6A21\u3001\u5173\u952E\u8BCD\u5339\u914D\u60C5\u51B5\u5224\u65AD\u662F\u5426\u503C\u5F97\u6536\u85CF\u3002"
    ].join("\n");
  }

  // src/shared/schema/aiDecision.ts
  var ALLOWED_DECISIONS = /* @__PURE__ */ new Set(["favorite", "skip", "unsure"]);
  function toStringArray(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean);
  }
  function extractJsonObject(input) {
    const start = input.indexOf("{");
    const end = input.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("\u6A21\u578B\u8FD4\u56DE\u4E2D\u672A\u627E\u5230 JSON \u5BF9\u8C61");
    }
    return input.slice(start, end + 1);
  }
  function normalizeAIDecision(value) {
    if (!value || typeof value !== "object") {
      throw new Error("\u6A21\u578B\u8FD4\u56DE\u683C\u5F0F\u65E0\u6548");
    }
    const record = value;
    const decision = typeof record.decision === "string" ? record.decision.trim() : "unsure";
    if (!ALLOWED_DECISIONS.has(decision)) {
      throw new Error(`\u4E0D\u652F\u6301\u7684 decision: ${String(record.decision)}`);
    }
    const reason = typeof record.reason === "string" ? record.reason.trim() : "";
    const confidenceValue = Number(record.confidence);
    const confidence = Number.isFinite(confidenceValue) ? Math.min(1, Math.max(0, confidenceValue)) : 0;
    return {
      decision,
      reason: reason || "\u6A21\u578B\u672A\u63D0\u4F9B\u539F\u56E0",
      matched: toStringArray(record.matched),
      missing: toStringArray(record.missing),
      confidence
    };
  }

  // src/ai/providers/openai.ts
  function normalizeBaseUrl(baseUrl) {
    const trimmed = baseUrl.trim().replace(/\/$/, "");
    if (!trimmed) {
      throw new Error("\u8BF7\u5148\u914D\u7F6E baseUrl");
    }
    return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
  }
  function getTextContent(content) {
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content.filter((item) => item.type === "text" && typeof item.text === "string").map((item) => item.text).join("\n");
    }
    return "";
  }
  var OpenAICompatibleProvider = class {
    async decide(input) {
      const endpoint = `${normalizeBaseUrl(input.settings.baseUrl)}/chat/completions`;
      const prompt = createDecisionPrompt(input.plan, input.evidence);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input.settings.apiKey.trim()}`
        },
        body: JSON.stringify({
          model: input.settings.model.trim() || "gpt-4.1-mini",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "\u4F60\u662F\u4E00\u4E2A\u4E25\u683C\u8F93\u51FA JSON \u7684\u5019\u9009\u4EBA\u7B5B\u9009\u52A9\u624B\u3002"
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: input.screenshotDataUrl,
                    detail: "high"
                  }
                }
              ]
            }
          ]
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`\u6A21\u578B\u8BF7\u6C42\u5931\u8D25: ${response.status} ${errorText}`);
      }
      const payload = await response.json();
      const rawContent = getTextContent(payload.choices?.[0]?.message?.content);
      const jsonText = extractJsonObject(rawContent);
      return normalizeAIDecision(JSON.parse(jsonText));
    }
  };

  // src/shared/storage.ts
  var SETTINGS_KEY = "settings";
  var LAST_SUMMARY_KEY = "lastSummary";
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
  async function getSettings() {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    return mergeSettings(stored[SETTINGS_KEY]);
  }
  async function saveSettings(settings) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: mergeSettings(settings) });
  }
  async function getLastSummary() {
    const stored = await chrome.storage.local.get(LAST_SUMMARY_KEY);
    return stored[LAST_SUMMARY_KEY] ?? null;
  }
  async function saveLastSummary(summary) {
    await chrome.storage.local.set({ [LAST_SUMMARY_KEY]: summary });
  }
  function mergeSettings(settings) {
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

  // src/automation/stateMachine.ts
  var runnerStateLabels = {
    idle: "\u7A7A\u95F2",
    precheck: "\u68C0\u67E5\u9875\u9762\u72B6\u6001",
    "scan-list": "\u8BFB\u53D6\u5019\u9009\u4EBA\u5217\u8868",
    "open-item": "\u6253\u5F00\u5019\u9009\u4EBA\u8BE6\u60C5",
    "capture-evidence": "\u91C7\u96C6\u9875\u9762\u8BC1\u636E",
    "request-decision": "\u8BF7\u6C42\u6A21\u578B\u5224\u65AD",
    "apply-action": "\u6267\u884C\u6536\u85CF\u52A8\u4F5C",
    "record-result": "\u8BB0\u5F55\u5904\u7406\u7ED3\u679C",
    complete: "\u5DF2\u5B8C\u6210",
    stopped: "\u5DF2\u505C\u6B62",
    error: "\u53D1\u751F\u5F02\u5E38"
  };

  // src/automation/runner.ts
  var AutomationRunner = class {
    constructor(deps) {
      this.deps = deps;
    }
    runtime = {
      state: "idle",
      message: "\u7B49\u5F85\u4EFB\u52A1",
      processed: 0,
      total: 0,
      favorited: 0,
      stopRequested: false
    };
    isRunning = false;
    stopRequested = false;
    getRuntimeStatus() {
      return this.runtime;
    }
    requestStop() {
      this.stopRequested = true;
      this.runtime = {
        ...this.runtime,
        state: "stopping",
        stopRequested: true,
        message: "\u505C\u6B62\u4E2D"
      };
    }
    async run(plan) {
      if (this.isRunning) {
        throw new Error("\u5DF2\u6709\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C");
      }
      this.isRunning = true;
      this.stopRequested = false;
      const startedAt = (/* @__PURE__ */ new Date()).toISOString();
      let tabId;
      try {
        const settings = await this.deps.getSettings();
        this.ensureProviderSettings(settings);
        const tab = await this.deps.getPageStatus();
        tabId = tab.id;
        if (tabId === void 0) {
          throw new Error("\u5F53\u524D\u6807\u7B7E\u9875\u65E0\u6548");
        }
        const pageStatus = await this.deps.requestPageStatus(tabId);
        if (!pageStatus.supported) {
          throw new Error(pageStatus.reason ?? "\u5F53\u524D\u9875\u9762\u4E0D\u53D7\u652F\u6301");
        }
        const provider = new OpenAICompatibleProvider();
        const results = [];
        let favorited = 0;
        let skipped = 0;
        let alreadyFavorited = 0;
        let errors = 0;
        const total = Math.min(pageStatus.candidateCount, plan.maxItems);
        this.updateState("precheck", {
          processed: 0,
          total,
          favorited,
          currentLabel: void 0,
          message: total > 0 ? runnerStateLabels.precheck : "\u672A\u627E\u5230\u53EF\u5904\u7406\u6761\u76EE"
        });
        await this.syncOverlay(tabId);
        for (let index = 0; index < total; index += 1) {
          if (this.stopRequested) {
            this.updateState("stopped", { message: "\u7528\u6237\u505C\u6B62\u4E86\u4EFB\u52A1" });
            break;
          }
          this.updateState("open-item", { currentLabel: `\u6761\u76EE ${index + 1}` });
          await this.syncOverlay(tabId);
          try {
            const evidence = await this.deps.processCandidate(tabId, index);
            this.updateState("capture-evidence", { currentLabel: evidence.label });
            await this.syncOverlay(tabId);
            if (plan.skipIfAlreadyFavorited && evidence.alreadyFavorited) {
              alreadyFavorited += 1;
              results.push({
                index,
                label: evidence.label,
                itemId: evidence.itemId,
                action: "already-favorited",
                reason: "\u8BE5\u6761\u76EE\u5DF2\u6536\u85CF"
              });
              this.markProcessed(index + 1, favorited, evidence.label);
              await this.syncOverlay(tabId);
              await this.delay(plan.delayMs);
              continue;
            }
            this.updateState("request-decision", { currentLabel: evidence.label });
            await this.syncOverlay(tabId);
            const screenshotDataUrl = await this.deps.captureVisibleTab(tab.windowId);
            const decision = await provider.decide({
              evidence,
              screenshotDataUrl,
              plan,
              settings: settings.provider
            });
            const action = await this.applyDecision(tabId, decision);
            if (action === "favorited") {
              favorited += 1;
            } else {
              skipped += 1;
            }
            results.push({
              index,
              label: evidence.label,
              itemId: evidence.itemId,
              action,
              reason: decision.reason,
              decision
            });
          } catch (error) {
            errors += 1;
            const message = error instanceof Error ? error.message : String(error);
            results.push({
              index,
              label: `\u6761\u76EE ${index + 1}`,
              itemId: `item-${index}`,
              action: "error",
              reason: message
            });
            await this.deps.showError(tabId, message);
          }
          this.markProcessed(index + 1, favorited, this.runtime.currentLabel);
          await this.syncOverlay(tabId);
          await this.delay(plan.delayMs);
        }
        const summary = {
          startedAt,
          completedAt: (/* @__PURE__ */ new Date()).toISOString(),
          processed: results.length,
          favorited,
          skipped,
          alreadyFavorited,
          errors,
          items: results
        };
        await saveLastSummary(summary);
        this.updateState(this.stopRequested ? "stopped" : "complete", {
          processed: results.length,
          total,
          favorited,
          currentLabel: void 0,
          message: this.stopRequested ? "\u4EFB\u52A1\u5DF2\u505C\u6B62" : "\u4EFB\u52A1\u5B8C\u6210"
        });
        await this.syncOverlay(tabId);
        await this.deps.showCompletion(tabId, summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.updateState("error", { message });
        if (tabId !== void 0) {
          await this.syncOverlay(tabId);
          await this.deps.showError(tabId, message);
        }
      } finally {
        this.isRunning = false;
        this.stopRequested = false;
        if (this.runtime.state === "running") {
          this.runtime = {
            ...this.runtime,
            state: "idle",
            stopRequested: false,
            currentLabel: void 0
          };
        }
      }
    }
    ensureProviderSettings(settings) {
      if (!settings.provider.baseUrl.trim() || !settings.provider.apiKey.trim()) {
        throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u9875\u914D\u7F6E baseUrl \u548C apiKey");
      }
    }
    async applyDecision(tabId, decision) {
      if (decision.decision !== "favorite") {
        return "skipped";
      }
      this.updateState("apply-action", { message: "\u6267\u884C\u6536\u85CF\u52A8\u4F5C" });
      await this.syncOverlay(tabId);
      const favorited = await this.deps.clickFavorite(tabId);
      return favorited ? "favorited" : "skipped";
    }
    markProcessed(processed, favorited, currentLabel) {
      this.updateState("record-result", {
        processed,
        favorited,
        currentLabel,
        message: `\u5DF2\u5904\u7406 ${processed} \u6761`
      });
    }
    updateState(state, partial = {}) {
      this.runtime = {
        ...this.runtime,
        state: state === "complete" ? "complete" : state === "error" ? "error" : state === "stopped" ? "stopping" : "running",
        message: partial.message ?? runnerStateLabels[state],
        stopRequested: this.stopRequested,
        ...partial
      };
    }
    async syncOverlay(tabId) {
      await this.deps.updateOverlay(tabId, this.runtime);
    }
    async delay(ms) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, ms));
    }
  };

  // src/background/index.ts
  function isMessageError(error) {
    return error instanceof Error ? error.message : String(error);
  }
  var devReloadScheduled = false;
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error("\u672A\u627E\u5230\u5F53\u524D\u6D3B\u52A8\u6807\u7B7E\u9875");
    }
    return tab;
  }
  async function sendToContent(tabId, message) {
    const response = await chrome.tabs.sendMessage(tabId, message);
    if (!response) {
      throw new Error("\u5185\u5BB9\u811A\u672C\u672A\u54CD\u5E94\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5");
    }
    if (!response.ok) {
      throw new Error(response.error);
    }
    return response;
  }
  async function requestActivePageStatus() {
    const tab = await getActiveTab();
    if (tab.id === void 0) {
      throw new Error("\u5F53\u524D\u6807\u7B7E\u9875\u65E0\u6548");
    }
    const response = await sendToContent(tab.id, { type: "GET_PAGE_STATUS" });
    return response.pageStatus;
  }
  async function syncDebugModeToActiveTab(enabled) {
    try {
      const tab = await getActiveTab();
      if (tab.id === void 0) {
        return;
      }
      await sendToContent(tab.id, { type: "SET_DEBUG_MODE", enabled });
    } catch {
    }
  }
  async function broadcastDevPrepareReload() {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs.map(async (tab) => {
        if (tab.id === void 0) {
          return;
        }
        try {
          await sendToContent(tab.id, { type: "DEV_PREPARE_RELOAD" });
        } catch {
        }
      })
    );
  }
  async function scheduleDevReload() {
    if (devReloadScheduled) {
      return;
    }
    devReloadScheduled = true;
    await broadcastDevPrepareReload();
    globalThis.setTimeout(() => {
      chrome.runtime.reload();
    }, 250);
  }
  var runner = new AutomationRunner({
    getPageStatus: getActiveTab,
    requestPageStatus: async (tabId) => {
      const response = await sendToContent(tabId, { type: "GET_PAGE_STATUS" });
      return response.pageStatus;
    },
    processCandidate: async (tabId, index) => {
      const response = await sendToContent(tabId, {
        type: "PROCESS_CANDIDATE",
        index
      });
      return response.evidence;
    },
    clickFavorite: async (tabId) => {
      const response = await sendToContent(tabId, { type: "CLICK_FAVORITE" });
      return response.favorited;
    },
    captureVisibleTab: async (windowId) => {
      if (windowId === void 0) {
        return chrome.tabs.captureVisibleTab({ format: "png" });
      }
      return chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    },
    updateOverlay: async (tabId, runtime) => {
      await sendToContent(tabId, { type: "UPDATE_OVERLAY", runtime });
    },
    showCompletion: async (tabId, summary) => {
      await sendToContent(tabId, { type: "SHOW_COMPLETION", summary });
    },
    showError: async (tabId, message) => {
      await sendToContent(tabId, { type: "SHOW_ERROR", message });
    },
    getSettings
  });
  async function handleRequest(request) {
    switch (request.type) {
      case "GET_PAGE_STATUS": {
        const pageStatus = await requestActivePageStatus();
        return { ok: true, pageStatus };
      }
      case "GET_SETTINGS": {
        const settings = await getSettings();
        return { ok: true, settings };
      }
      case "SAVE_SETTINGS": {
        await saveSettings(request.settings);
        await syncDebugModeToActiveTab(Boolean(request.settings.debug?.enabled));
        return { ok: true, accepted: true };
      }
      case "GET_RUNTIME_STATUS": {
        return { ok: true, runtime: runner.getRuntimeStatus() };
      }
      case "GET_LAST_SUMMARY": {
        const summary = await getLastSummary();
        return { ok: true, summary };
      }
      case "DEV_RELOAD_EXTENSION": {
        await scheduleDevReload();
        return { ok: true, accepted: true };
      }
      case "START_RUN": {
        void runner.run(request.plan);
        return { ok: true, accepted: true };
      }
      case "STOP_RUN": {
        runner.requestStop();
        return { ok: true, accepted: true };
      }
      default: {
        throw new Error("\u672A\u77E5\u8BF7\u6C42\u7C7B\u578B");
      }
    }
  }
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    handleRequest(request).then(sendResponse).catch((error) => sendResponse({ ok: false, error: isMessageError(error) }));
    return true;
  });
  chrome.runtime.onInstalled.addListener(async () => {
    const settings = await getSettings();
    await saveSettings(settings);
  });
})();
