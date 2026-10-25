
(() => {
  // Read from Monaco's full text model when LeetCode exposes it.
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    const request = event.data;

    if (request?.type !== "DSA_COPILOT_READ_EDITOR") return;

    let code = "";

    try {
      const monaco = window.monaco;

      if (monaco?.editor?.getModels) {
        const models = monaco.editor.getModels();

        // Prefer a model associated with a LeetCode editor.
        // Avoid returning a model if multiple candidates are ambiguous.
        const candidates = models
          .map(model => {
            let value = "";

            try {
              value = model.getValue();
            } catch {
              // Ignore models that cannot be read.
            }

            return {
              value,
              uri: String(model.uri || "")
            };
          })
          .filter(item => item.value.trim());

        if (candidates.length === 1) {
          code = candidates[0].value;
        } else if (candidates.length > 1) {
          const leetCodeModels = candidates.filter(item =>
            /leetcode|solution|answer/i.test(item.uri)
          );

          if (leetCodeModels.length === 1) {
            code = leetCodeModels[0].value;
          }
        }
      }
    } catch (error) {
      console.warn("Could not read Monaco model:", error);
    }

    window.postMessage({
      type: "DSA_COPILOT_EDITOR_RESULT",
      requestId: request.requestId,
      code
    }, "*");
  });
})();
