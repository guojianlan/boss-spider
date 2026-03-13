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
  function startContentScriptDevWatcher() {
    startWatcher("content", () => {
      const request = { type: "DEV_RELOAD_EXTENSION" };
      void chrome.runtime.sendMessage(request).catch(() => {
      });
    });
  }

  // src/shared/storage.ts
  var SETTINGS_KEY = "settings";
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

  // src/content/debugTools.ts
  var ROOT_ID = "__boss_spider_debug__";
  var STATUS_ID = "__boss_spider_debug_status__";
  var BUTTON_ID = "__boss_spider_debug_export__";
  var attributeNames = /* @__PURE__ */ new Set(["href", "role", "name", "type", "value", "placeholder"]);
  var exportInProgress = false;
  function escapeSelectorPart(value) {
    return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
  function truncate(value, maxLength) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
  }
  function getOwnText(element) {
    const textParts = [];
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType !== Node.TEXT_NODE) {
        continue;
      }
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (text) {
        textParts.push(text);
      }
    }
    const joined = textParts.join(" ");
    return joined ? truncate(joined, 160) : void 0;
  }
  function collectAttributes(element) {
    const attributes = {};
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name === "id" || attribute.name === "class" || attribute.name === "style") {
        continue;
      }
      if (attribute.name.startsWith("data-") || attribute.name.startsWith("aria-") || attributeNames.has(attribute.name)) {
        attributes[attribute.name] = truncate(attribute.value, 200);
      }
    }
    return Object.keys(attributes).length > 0 ? attributes : void 0;
  }
  function getRect(element) {
    const rect = element.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      return void 0;
    }
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }
  function isVisible(element, rect) {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && Boolean(rect);
  }
  function buildSelectorHint(element) {
    if (element === document.body) {
      return "body";
    }
    const parts = [];
    let current = element;
    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase();
      const htmlElement = current;
      if (htmlElement.id) {
        part += `#${escapeSelectorPart(htmlElement.id)}`;
        parts.unshift(part);
        break;
      }
      const classNames = Array.from(htmlElement.classList).slice(0, 2);
      if (classNames.length > 0) {
        part += classNames.map((name) => `.${escapeSelectorPart(name)}`).join("");
      }
      const currentTagName = current.tagName;
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) => child.tagName === currentTagName);
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
      }
      parts.unshift(part);
      current = parent;
    }
    return `body > ${parts.join(" > ")}`;
  }
  function shouldSkipElement(element) {
    const tagName = element.tagName.toLowerCase();
    return tagName === "script" || tagName === "style" || tagName === "template" || element.id === ROOT_ID;
  }
  function snapshotElement(element) {
    const htmlElement = element;
    const rect = getRect(element);
    return {
      tag: element.tagName.toLowerCase(),
      selectorHint: buildSelectorHint(element),
      id: htmlElement.id || void 0,
      classes: htmlElement.classList.length > 0 ? Array.from(htmlElement.classList) : void 0,
      attributes: collectAttributes(element),
      ownText: getOwnText(element),
      visible: isVisible(element, rect),
      rect,
      childElementCount: element.children.length,
      children: Array.from(element.children).filter((child) => !shouldSkipElement(child)).map((child) => snapshotElement(child))
    };
  }
  function captureDocumentSnapshot() {
    return {
      capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
      url: location.href,
      title: document.title,
      body: document.body ? snapshotElement(document.body) : null
    };
  }
  function downloadSnapshot(snapshot) {
    const fileName = `boss-spider-dom-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.json`;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    return fileName;
  }
  function setStatus(message) {
    const status = document.getElementById(STATUS_ID);
    if (status) {
      status.textContent = message;
    }
  }
  async function handleExportClick() {
    if (exportInProgress) {
      return;
    }
    exportInProgress = true;
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      button.disabled = true;
      button.textContent = "\u5BFC\u51FA\u4E2D...";
    }
    try {
      setStatus("\u6B63\u5728\u91C7\u96C6 document.body \u4E0B\u7684\u5143\u7D20\u6811...");
      const snapshot = captureDocumentSnapshot();
      const fileName = downloadSnapshot(snapshot);
      setStatus(`\u5DF2\u4E0B\u8F7D ${fileName}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      exportInProgress = false;
      if (button) {
        button.disabled = false;
        button.textContent = "\u5BFC\u51FA DOM \u5FEB\u7167";
      }
    }
  }
  function removeDebugRoot() {
    document.getElementById(ROOT_ID)?.remove();
  }
  function buildDebugRoot() {
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.style.position = "fixed";
    root.style.left = "20px";
    root.style.bottom = "20px";
    root.style.zIndex = "2147483647";
    root.style.width = "320px";
    root.style.padding = "14px";
    root.style.borderRadius = "14px";
    root.style.background = "rgba(15, 23, 42, 0.96)";
    root.style.color = "#fff";
    root.style.boxShadow = "0 20px 40px rgba(15, 23, 42, 0.35)";
    root.style.backdropFilter = "blur(6px)";
    root.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const title = document.createElement("div");
    title.textContent = "Boss Spider Debug";
    title.style.fontSize = "14px";
    title.style.fontWeight = "700";
    title.style.marginBottom = "8px";
    const description = document.createElement("div");
    description.textContent = "\u5BFC\u51FA document.body \u7684\u5143\u7D20\u6811\u3001\u5173\u952E\u5C5E\u6027\u548C\u53EF\u89C1\u533A\u57DF\uFF0C\u65B9\u4FBF\u5B9A\u4F4D\u5217\u8868\u533A\u548C\u8BE6\u60C5\u533A\u3002";
    description.style.fontSize = "12px";
    description.style.lineHeight = "1.6";
    description.style.opacity = "0.88";
    description.style.marginBottom = "10px";
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "\u5BFC\u51FA DOM \u5FEB\u7167";
    button.style.width = "100%";
    button.style.border = "0";
    button.style.borderRadius = "10px";
    button.style.padding = "10px 12px";
    button.style.background = "#38bdf8";
    button.style.color = "#082f49";
    button.style.fontSize = "13px";
    button.style.fontWeight = "700";
    button.style.cursor = "pointer";
    button.addEventListener("click", () => {
      void handleExportClick();
    });
    const status = document.createElement("div");
    status.id = STATUS_ID;
    status.textContent = "\u8C03\u8BD5\u6A21\u5F0F\u5DF2\u5F00\u542F";
    status.style.marginTop = "10px";
    status.style.fontSize = "12px";
    status.style.lineHeight = "1.6";
    status.style.opacity = "0.8";
    root.appendChild(title);
    root.appendChild(description);
    root.appendChild(button);
    root.appendChild(status);
    return root;
  }
  function ensureDebugRoot() {
    if (document.getElementById(ROOT_ID)) {
      return;
    }
    document.documentElement.appendChild(buildDebugRoot());
  }
  async function syncDebugTools(enabled) {
    const nextEnabled = typeof enabled === "boolean" ? enabled : (await getSettings()).debug.enabled;
    if (!nextEnabled) {
      removeDebugRoot();
      return;
    }
    ensureDebugRoot();
    setStatus("\u8C03\u8BD5\u6A21\u5F0F\u5DF2\u5F00\u542F");
  }

  // src/content/overlay.ts
  var ROOT_ID2 = "__boss_spider_overlay__";
  function ensureRoot() {
    let root = document.getElementById(ROOT_ID2);
    if (root) {
      return root;
    }
    root = document.createElement("div");
    root.id = ROOT_ID2;
    root.style.position = "fixed";
    root.style.right = "20px";
    root.style.bottom = "20px";
    root.style.zIndex = "2147483647";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.gap = "12px";
    root.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    document.documentElement.appendChild(root);
    return root;
  }
  function buildCard() {
    const card = document.createElement("div");
    card.style.width = "320px";
    card.style.background = "rgba(17, 24, 39, 0.96)";
    card.style.color = "#fff";
    card.style.borderRadius = "14px";
    card.style.padding = "14px";
    card.style.boxShadow = "0 20px 40px rgba(15, 23, 42, 0.35)";
    card.style.backdropFilter = "blur(6px)";
    return card;
  }
  function renderRuntimeOverlay(runtime) {
    const root = ensureRoot();
    let card = root.querySelector('[data-role="runtime"]');
    if (!card) {
      card = buildCard();
      card.dataset.role = "runtime";
      root.appendChild(card);
    }
    card.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:8px;">Boss Spider \u8FD0\u884C\u4E2D</div>
    <div style="font-size:12px;opacity:0.86;line-height:1.6;">
      <div>\u72B6\u6001\uFF1A${runtime.message}</div>
      <div>\u8FDB\u5EA6\uFF1A${runtime.processed}/${runtime.total || 0}</div>
      <div>\u6536\u85CF\uFF1A${runtime.favorited}</div>
      <div>\u5F53\u524D\uFF1A${runtime.currentLabel ?? "\u7B49\u5F85\u4E2D"}</div>
      <div>${runtime.stopRequested ? "\u5DF2\u6536\u5230\u505C\u6B62\u8BF7\u6C42\uFF0C\u6B63\u5728\u6536\u5C3E\u3002" : "\u53EF\u5728\u5F39\u7A97\u4E2D\u505C\u6B62\u4EFB\u52A1\u3002"}</div>
    </div>
  `;
  }
  function showCompletionToast(summary) {
    const root = ensureRoot();
    const toast = buildCard();
    toast.dataset.role = "toast";
    toast.style.background = "rgba(3, 105, 161, 0.95)";
    toast.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:8px;">\u4EFB\u52A1\u5B8C\u6210</div>
    <div style="font-size:12px;line-height:1.6;opacity:0.92;">
      <div>\u5904\u7406\uFF1A${summary.processed}</div>
      <div>\u6536\u85CF\uFF1A${summary.favorited}</div>
      <div>\u8DF3\u8FC7\uFF1A${summary.skipped + summary.alreadyFavorited}</div>
      <div>\u5F02\u5E38\uFF1A${summary.errors}</div>
    </div>
  `;
    root.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 8e3);
  }
  function showErrorToast(message) {
    const root = ensureRoot();
    const toast = buildCard();
    toast.dataset.role = "toast";
    toast.style.background = "rgba(153, 27, 27, 0.95)";
    toast.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:8px;">\u8FD0\u884C\u5F02\u5E38</div>
    <div style="font-size:12px;line-height:1.6;opacity:0.92;">${message}</div>
  `;
    root.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 1e4);
  }

  // src/sites/boss/selectors.ts
  var bossSelectors = {
    listContainer: [
      '[data-testid="geek-list"]',
      ".candidate-list",
      ".ui-dropmenu-list",
      ".search-list"
    ],
    listItems: [
      '[data-testid="geek-item"]',
      ".candidate-item",
      ".geek-item",
      ".search-card"
    ],
    detailPanel: [
      '[data-testid="candidate-detail"]',
      ".candidate-detail",
      ".resume-detail",
      ".detail-content"
    ],
    favoriteButton: [
      '[data-testid="favorite-button"]',
      'button[data-action="favorite"]',
      ".btn-collect",
      ".collect-btn",
      "button:has(.icon-star)",
      "button:has(.icon-collect)"
    ],
    activeItem: [".active", ".is-active", '[aria-selected="true"]'],
    tagElements: [".tag", ".label", ".resume-tag", '[data-testid="tag"]']
  };

  // src/sites/boss/extractors.ts
  function queryFirst(selectors, root = document) {
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      if (element) {
        return element;
      }
    }
    return null;
  }
  function getListContainer() {
    return queryFirst(bossSelectors.listContainer);
  }
  function getListItems() {
    const container = getListContainer() ?? document;
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    for (const selector of bossSelectors.listItems) {
      for (const element of Array.from(container.querySelectorAll(selector))) {
        if (!seen.has(element)) {
          seen.add(element);
          items.push(element);
        }
      }
    }
    return items;
  }
  function getDetailPanel() {
    return queryFirst(bossSelectors.detailPanel);
  }
  function getFavoriteButton() {
    return queryFirst(bossSelectors.favoriteButton);
  }
  function getVisibleText(element) {
    return (element?.innerText ?? "").split("\n").map((line) => line.trim()).filter(Boolean).join("\n");
  }
  function getItemLabel(item) {
    return getVisibleText(item).split("\n").slice(0, 3).join(" / ") || `\u5019\u9009\u4EBA ${item.dataset.index ?? ""}`.trim();
  }
  function getItemId(item, fallbackIndex) {
    return item.getAttribute("data-id") ?? item.getAttribute("ka") ?? item.id ?? `item-${fallbackIndex}`;
  }
  function getTagTexts(root) {
    if (!root) {
      return [];
    }
    const seen = /* @__PURE__ */ new Set();
    for (const selector of bossSelectors.tagElements) {
      for (const element of Array.from(root.querySelectorAll(selector))) {
        const text = element.innerText.trim();
        if (text) {
          seen.add(text);
        }
      }
    }
    return Array.from(seen);
  }
  function inferFavoriteState(button) {
    if (!button) {
      return false;
    }
    const joinedText = `${button.innerText} ${button.getAttribute("aria-label") ?? ""} ${button.className}`.toLowerCase();
    return /已收藏|取消收藏|已关注|active|collected|favorited/.test(joinedText);
  }

  // src/sites/boss/actions.ts
  async function delay(ms) {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  }
  function clickElement(element) {
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    element.click();
  }
  async function waitForDetailChange(previousSnapshot, timeoutMs = 6e3) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const detail2 = getDetailPanel();
      const text = getVisibleText(detail2);
      if (detail2 && text && text !== previousSnapshot) {
        return detail2;
      }
      await delay(250);
    }
    const detail = getDetailPanel();
    if (!detail) {
      throw new Error("\u672A\u627E\u5230\u53F3\u4FA7\u8BE6\u60C5\u533A\u57DF");
    }
    return detail;
  }
  function getPageSupportStatus() {
    const items = getListItems();
    const detail = getDetailPanel();
    return {
      supported: items.length > 0 && detail !== null,
      url: location.href,
      reason: items.length > 0 && detail ? void 0 : "\u672A\u8BC6\u522B\u5230\u5217\u8868\u6216\u53F3\u4FA7\u8BE6\u60C5\u533A\u57DF",
      candidateCount: items.length
    };
  }
  async function processCandidate(index) {
    const items = getListItems();
    const item = items[index];
    if (!item) {
      throw new Error(`\u672A\u627E\u5230\u7D22\u5F15\u4E3A ${index} \u7684\u5019\u9009\u4EBA\u9879`);
    }
    const previousSnapshot = getVisibleText(getDetailPanel());
    clickElement(item);
    await delay(500);
    const detail = await waitForDetailChange(previousSnapshot);
    const favoriteButton = getFavoriteButton();
    return {
      index,
      label: getItemLabel(item),
      itemId: getItemId(item, index),
      detailText: getVisibleText(detail),
      summaryText: getVisibleText(item),
      tags: getTagTexts(detail),
      alreadyFavorited: inferFavoriteState(favoriteButton)
    };
  }
  async function clickFavorite() {
    const button = getFavoriteButton();
    if (!button) {
      throw new Error("\u672A\u627E\u5230\u6536\u85CF\u6309\u94AE");
    }
    const before = inferFavoriteState(button);
    if (before) {
      return true;
    }
    clickElement(button);
    await delay(500);
    return inferFavoriteState(getFavoriteButton());
  }

  // src/sites/boss/adapter.ts
  var bossAdapter = {
    getPageStatus() {
      return getPageSupportStatus();
    },
    processCandidate(index) {
      return processCandidate(index);
    },
    clickFavorite() {
      return clickFavorite();
    }
  };

  // src/sites/jobs/selectors.ts
  var jobsSelectors = {
    pageRoots: [".job-search-page", ".job-list-box", ".job-recommend-main", '[data-page="job-list"]'],
    listContainer: [".job-list-box", ".rec-job-list", ".search-job-result", ".job-list"],
    listItems: [".job-card-wrapper", ".job-card-box", ".job-card-body", ".search-job-result .job-card-wrapper"],
    detailPanel: [".job-detail-box", ".job-detail", ".job-detail-content", ".job-info-main"],
    favoriteButton: [
      "button:has(.icon-collect)",
      "button:has(.icon-star)",
      ".btn-collect",
      ".collect-btn",
      'button[data-action="favorite"]'
    ],
    tagElements: [".tag-list li", ".job-label-list li", ".labels-tag li", ".job-tag", ".company-tag li"],
    companyName: [".company-name", ".company-info h3", ".company-card .name", ".company-title"],
    jobTitle: [".job-name", ".name", ".job-title", ".info-primary .name"],
    activeItem: [".active", ".is-active", '[aria-selected="true"]']
  };

  // src/sites/jobs/extractors.ts
  function queryFirst2(selectors, root = document) {
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      if (element) {
        return element;
      }
    }
    return null;
  }
  function isJobsPageUrl() {
    return location.pathname.startsWith("/web/geek/jobs");
  }
  function getJobsPageRoot() {
    return queryFirst2(jobsSelectors.pageRoots);
  }
  function getJobsListContainer() {
    return queryFirst2(jobsSelectors.listContainer);
  }
  function getJobsListItems() {
    const container = getJobsListContainer() ?? getJobsPageRoot() ?? document;
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    for (const selector of jobsSelectors.listItems) {
      for (const element of Array.from(container.querySelectorAll(selector))) {
        if (!seen.has(element)) {
          seen.add(element);
          items.push(element);
        }
      }
    }
    return items;
  }
  function getJobsDetailPanel() {
    return queryFirst2(jobsSelectors.detailPanel);
  }
  function getJobsFavoriteButton() {
    return queryFirst2(jobsSelectors.favoriteButton);
  }
  function getJobsItemId(item, fallbackIndex) {
    return item.getAttribute("data-job-id") ?? item.getAttribute("data-id") ?? item.getAttribute("ka") ?? item.id ?? `job-${fallbackIndex}`;
  }
  function getJobsTitle(root = document) {
    return getVisibleText(queryFirst2(jobsSelectors.jobTitle, root)).split("\n")[0] ?? "";
  }
  function getJobsCompanyName(root = document) {
    return getVisibleText(queryFirst2(jobsSelectors.companyName, root)).split("\n")[0] ?? "";
  }
  function getJobsItemLabel(item) {
    const raw = getVisibleText(item).split("\n").filter(Boolean);
    return raw.slice(0, 4).join(" / ") || `\u804C\u4F4D ${item.dataset.index ?? ""}`.trim();
  }
  function getJobsTags(root) {
    return getTagTexts(root);
  }
  function inferJobsFavoriteState() {
    return inferFavoriteState(getJobsFavoriteButton());
  }

  // src/sites/jobs/actions.ts
  async function delay2(ms) {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  }
  function clickElement2(element) {
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    element.click();
  }
  async function waitForDetailChange2(previousSnapshot, timeoutMs = 6e3) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const detail2 = getJobsDetailPanel();
      const text = getVisibleText(detail2);
      if (detail2 && text && text !== previousSnapshot) {
        return detail2;
      }
      await delay2(250);
    }
    const detail = getJobsDetailPanel();
    if (!detail) {
      throw new Error("\u672A\u627E\u5230\u804C\u4F4D\u8BE6\u60C5\u533A\u57DF");
    }
    return detail;
  }
  function getJobsPageSupportStatus() {
    const items = getJobsListItems();
    const detail = getJobsDetailPanel();
    const supported = isJobsPageUrl() && items.length > 0 && detail !== null;
    return {
      supported,
      url: location.href,
      reason: supported ? void 0 : isJobsPageUrl() ? "\u672A\u8BC6\u522B\u5230\u804C\u4F4D\u5217\u8868\u6216\u53F3\u4FA7\u804C\u4F4D\u8BE6\u60C5\u533A\u57DF" : "\u5F53\u524D\u4E0D\u662F\u652F\u6301\u7684\u804C\u4F4D\u5217\u8868\u9875",
      candidateCount: items.length
    };
  }
  async function processJob(index) {
    const items = getJobsListItems();
    const item = items[index];
    if (!item) {
      throw new Error(`\u672A\u627E\u5230\u7D22\u5F15\u4E3A ${index} \u7684\u804C\u4F4D\u9879`);
    }
    const previousSnapshot = getVisibleText(getJobsDetailPanel());
    clickElement2(item);
    await delay2(500);
    const detail = await waitForDetailChange2(previousSnapshot);
    const title = getJobsTitle(detail) || getJobsTitle(item);
    const companyName = getJobsCompanyName(detail) || getJobsCompanyName(item);
    const summaryText = getVisibleText(item);
    const detailText = getVisibleText(detail);
    const label = [title, companyName, getJobsItemLabel(item)].filter(Boolean).join(" / ");
    return {
      index,
      label,
      itemId: getJobsItemId(item, index),
      summaryText,
      detailText,
      tags: getJobsTags(detail),
      alreadyFavorited: inferJobsFavoriteState()
    };
  }
  async function clickJobsFavorite() {
    const button = getJobsFavoriteButton();
    if (!button) {
      throw new Error("\u672A\u627E\u5230\u804C\u4F4D\u6536\u85CF\u6309\u94AE");
    }
    if (inferJobsFavoriteState()) {
      return true;
    }
    clickElement2(button);
    await delay2(500);
    return inferJobsFavoriteState();
  }

  // src/sites/jobs/adapter.ts
  var jobsAdapter = {
    getPageStatus() {
      return getJobsPageSupportStatus();
    },
    processCandidate(index) {
      return processJob(index);
    },
    clickFavorite() {
      return clickJobsFavorite();
    }
  };

  // src/content/index.ts
  function ok(payload) {
    return payload;
  }
  function resolveAdapter() {
    if (location.pathname.startsWith("/web/geek/jobs")) {
      return jobsAdapter;
    }
    if (location.hostname.endsWith("zhipin.com")) {
      return bossAdapter;
    }
    return null;
  }
  async function handleRequest(request) {
    const adapter = resolveAdapter();
    switch (request.type) {
      case "GET_PAGE_STATUS":
        return adapter ? ok({ ok: true, pageStatus: adapter.getPageStatus() }) : { ok: false, error: "\u5F53\u524D\u9875\u9762\u6682\u4E0D\u652F\u6301" };
      case "PROCESS_CANDIDATE":
        if (!adapter) {
          return { ok: false, error: "\u5F53\u524D\u9875\u9762\u6682\u4E0D\u652F\u6301\u5904\u7406\u5217\u8868\u9879" };
        }
        return ok({ ok: true, evidence: await adapter.processCandidate(request.index) });
      case "CLICK_FAVORITE":
        if (!adapter) {
          return { ok: false, error: "\u5F53\u524D\u9875\u9762\u6682\u4E0D\u652F\u6301\u6536\u85CF\u52A8\u4F5C" };
        }
        return ok({ ok: true, favorited: await adapter.clickFavorite() });
      case "DEV_PREPARE_RELOAD":
        globalThis.setTimeout(() => {
          location.reload();
        }, 900);
        return ok({ ok: true });
      case "SET_DEBUG_MODE":
        syncDebugTools(request.enabled);
        return ok({ ok: true });
      case "UPDATE_OVERLAY":
        renderRuntimeOverlay(request.runtime);
        return ok({ ok: true });
      case "SHOW_COMPLETION":
        showCompletionToast(request.summary);
        return ok({ ok: true });
      case "SHOW_ERROR":
        showErrorToast(request.message);
        return ok({ ok: true });
      default:
        return { ok: false, error: "\u672A\u77E5\u5185\u5BB9\u811A\u672C\u8BF7\u6C42" };
    }
  }
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    handleRequest(request).then(sendResponse).catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    });
    return true;
  });
  void syncDebugTools();
  startContentScriptDevWatcher();
})();
