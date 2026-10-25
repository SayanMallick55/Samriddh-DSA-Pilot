
let bridgeReady = false;
let bridgeLoading = null;

function loadPageBridge() {
  if (bridgeReady) return Promise.resolve();

  if (bridgeLoading) return bridgeLoading;

  bridgeLoading = new Promise((resolve) => {
    const script = document.createElement("script");

    script.src = chrome.runtime.getURL("page-bridge.js");

    script.onload = () => {
      script.remove();
      bridgeReady = true;
      resolve();
    };

    script.onerror = () => {
      script.remove();
      bridgeLoading = null;
      console.warn("Could not load the editor bridge.");
      resolve();
    };

    (document.head || document.documentElement).appendChild(script);
  });

  return bridgeLoading;
}

function getVisibleEditorCode() {
  const editors = document.querySelectorAll(".monaco-editor");

  // Prefer the editor containing the most visible code.
  let bestCode = "";

  for (const editor of editors) {
    const lines = editor.querySelectorAll(".view-lines .view-line");

    const code = Array.from(lines)
      .map(line => line.innerText || line.textContent || "")
      .join("\n")
      .trim();

    if (code.length > bestCode.length) {
      bestCode = code;
    }
  }

  return bestCode;
}

function getProblemTitle() {
  const selectors = [
    '[data-cy="question-title"]',
    'a[href*="/problems/"][class*="title"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const title = (element?.innerText || element?.textContent || "").trim();

    if (title) return title;
  }

  return (document.title || "")
    .split(" - LeetCode")[0]
    .trim();
}

function getProblemDescription() {
  const selectors = [
    '[data-track-load="description_content"]',
    '[data-cy="question-content"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const description = (element?.innerText || "").trim();

    if (description) return description;
  }

  return "";
}

async function getLatestEditorCode() {
  await loadPageBridge();

  // Ask the page-context bridge to read Monaco's full model.
  const requestId =
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const modelCode = await new Promise((resolve) => {
    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      window.removeEventListener("message", handleMessage);
      resolve("");
    }, 1500);

    function handleMessage(event) {
      if (event.source !== window) return;

      const data = event.data;

      if (
        data?.type !== "DSA_COPILOT_EDITOR_RESULT" ||
        data.requestId !== requestId
      ) {
        return;
      }

      if (finished) return;
      finished = true;

      clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
      resolve(typeof data.code === "string" ? data.code : "");
    }

    window.addEventListener("message", handleMessage);

    window.postMessage({
      type: "DSA_COPILOT_READ_EDITOR",
      requestId
    }, "*");
  });

  if (modelCode.trim()) {
    return {
      code: modelCode,
      source: "model"
    };
  }

  // Fallback: rendered lines only. This may be incomplete.
  const visibleCode = getVisibleEditorCode();

  return {
    code: visibleCode,
    source: visibleCode ? "visible" : "none"
  };
}

async function getProblemDetails() {
  const title = getProblemTitle();
  const description = getProblemDescription();
  const editor = await getLatestEditorCode();

  return {
    title,
    description,
    code: editor.code,
    codeSource: editor.source,
    url: window.location.href
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_PROBLEM") {
    getProblemDetails()
      .then(sendResponse)
      .catch(error => {
        console.error("Could not read LeetCode problem:", error);

        sendResponse({
          title: getProblemTitle(),
          description: getProblemDescription(),
          code: "",
          codeSource: "none",
          url: window.location.href,
          error: "Could not read the current editor contents."
        });
      });

    // Keep the message channel open for the asynchronous response.
    return true;
  }
});
