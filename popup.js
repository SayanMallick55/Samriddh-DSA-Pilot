
const readBtn = document.getElementById("readBtn");
const hintBtn = document.getElementById("hintBtn");
const attempt = document.getElementById("attempt");
const response = document.getElementById("response");
const problemTitle = document.getElementById("problemTitle");
const problemDescription = document.getElementById("problemDescription");
const codePreview = document.getElementById("codePreview");
const solutionBtn = document.getElementById("solutionBtn");

const API_URL = "http://localhost:3000";
const STORAGE_PREFIX = "dsaCopilotSession:";

let currentProblem = null;
let currentHintLevel = 1;
let savedHints = [];
let savedSolution = "";
let currentSessionKey = null;
let currentTabId = null;
let busy = false;

// Normalize URLs so trailing slashes do not create false mismatches.
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function getSessionKey(tabId) {
  return `${STORAGE_PREFIX}tab:${tabId}`;
}


async function refreshCurrentProblemCode() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (
    tab?.id == null ||
    tab.id !== currentTabId ||
    !tab.url?.startsWith("https://leetcode.com/problems/")
  ) {
    throw new Error(
      "Return to the same LeetCode problem before requesting a hint."
    );
  }

  if (
    currentProblem?.url &&
    normalizeUrl(tab.url) !== normalizeUrl(currentProblem.url)
  ) {
    throw new Error(
      "A different LeetCode problem is open. Click Read Problem first."
    );
  }

  const latestProblem = await chrome.tabs.sendMessage(tab.id, {
    action: "GET_PROBLEM"
  });

  if (!latestProblem?.title || !latestProblem?.description) {
    throw new Error(
      "Could not refresh the problem. Reload LeetCode and try again."
    );
  }

  // Refresh the problem details and latest visible editor code.
 
currentProblem = {
  ...currentProblem,
  title: latestProblem.title,
  description: latestProblem.description,
  code: latestProblem.code || "",
  codeSource: latestProblem.codeSource || "none",
  url: tab.url
};


  if (codePreview) {
    codePreview.textContent =
      currentProblem.code || "No code detected.";
  }
  
if (currentProblem.codeSource === "visible") {
  response.textContent =
    "Warning: only visible editor lines were detected. " +
    "The code may be incomplete.";
} else if (currentProblem.codeSource === "none") {
  response.textContent =
    "Warning: no editor code was detected.";
}

}



// Extract only the LeetCode-ready C++ solution from Gemini's response.
function extractCppCode(solution) {
  if (!solution) return "";

  // Prefer a fenced C++ code block.
  const match = solution.match(
    /```(?:cpp|c\+\+|c)?\s*([\s\S]*?)```/i
  );

  let code = match ? match[1].trim() : solution.trim();

  // If no code fence exists, extract the Solution class.
  if (!match) {
    const classIndex = code.indexOf("class Solution");

    if (classIndex !== -1) {
      code = code.substring(classIndex);

      // Remove any explanation that appears after the code.
      const ending = code.search(
        /\n\s*(?:COMPLEXITY|IMPORTANT EDGE CASES|APPROACH)\s*:/i
      );

      if (ending !== -1) {
        code = code.substring(0, ending);
      }
    }
  }

  // Remove unwanted headers and namespace declarations.
  code = code
    .split("\n")
    .filter(line => !line.trim().startsWith("#include"))
    .filter(line => line.trim() !== "using namespace std;")
    .join("\n")
    .trim();

  // Remove accidental Markdown fences left in the output.
  code = code
    .replace(/^```(?:cpp|c\+\+|c)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return code;
}

async function saveSession() {
  if (!currentSessionKey || !currentProblem) return;

  await chrome.storage.local.set({
    [currentSessionKey]: {
      tabId: currentTabId,
      problem: currentProblem,
      attempt: attempt.value,
      hintLevel: currentHintLevel,
      hints: savedHints,
      solution: savedSolution
    }
  });
}

function clearDisplay(message = "Click Read Problem to start.") {
  currentProblem = null;
  currentHintLevel = 1;
  savedHints = [];
  savedSolution = "";

  problemTitle.textContent = "No problem loaded";
  problemDescription.textContent = "";

  if (codePreview) {
    codePreview.textContent = "";
  }

  attempt.value = "";
  response.textContent = message;

  hintBtn.textContent = "Get Hint";
  hintBtn.disabled = false;

  if (solutionBtn) {
    solutionBtn.textContent = "Give Me Full Code";
    solutionBtn.disabled = false;
  }
}

function displaySession(session) {
  currentProblem = session.problem;
  currentHintLevel = session.hintLevel || 1;
  savedHints = session.hints || [];
  savedSolution = session.solution || "";

  problemTitle.textContent = currentProblem.title;
  problemDescription.textContent = currentProblem.description;
  attempt.value = session.attempt || "";

  if (codePreview) {
    codePreview.textContent =
      currentProblem.code || "No code detected.";
  }

  if (savedSolution) {
    // Display only the clean C++ code, not the full AI response.
    response.textContent = extractCppCode(savedSolution);
  } else if (savedHints.length > 0) {
    response.textContent = savedHints.join(
      "\n\n--------------------\n\n"
    );
  } else {
    response.textContent = "Problem details loaded successfully.";
  }

  hintBtn.textContent =
    currentHintLevel <= 4
      ? `Get Hint ${currentHintLevel}`
      : "All Hints Viewed";

  hintBtn.disabled = currentHintLevel > 4;

  if (solutionBtn) {
    solutionBtn.textContent = savedSolution
      ? "Full Solution Saved"
      : "Give Me Full Code";

    solutionBtn.disabled = false;
  }
}


async function restoreSession() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (
      tab?.id == null ||
      !tab.url?.startsWith("https://leetcode.com/problems/")
    ) {
      currentTabId = tab?.id ?? null;
      currentSessionKey = null;
      clearDisplay("Open a LeetCode problem to continue.");
      return;
    }

    currentTabId = tab.id;
    currentSessionKey = getSessionKey(currentTabId);

    const stored = await chrome.storage.local.get(currentSessionKey);
    const session = stored[currentSessionKey];

    if (!session?.problem) {
      clearDisplay("Click Read current LeetCode problem to start.");
      return;
    }

    const activeUrl = normalizeUrl(tab.url);
    const savedUrl = normalizeUrl(session.problem.url || "");

    if (activeUrl !== savedUrl) {
      clearDisplay("Different problem detected. Click Read Problem.");
      return;
    }

    // Restore the saved problem and all previous progress first.
    displaySession(session);

    // Refresh only the code; do not clear the saved hints or attempt.
    try {
      const latestProblem = await chrome.tabs.sendMessage(tab.id, {
        action: "GET_PROBLEM"
      });

      if (latestProblem?.code?.trim()) {
        currentProblem = {
          ...currentProblem,
          code: latestProblem.code,
          codeSource: latestProblem.codeSource || "none"
        };

        if (codePreview) {
          codePreview.textContent = currentProblem.code;
        }

        await saveSession();
      }
    } catch (error) {
      // Keep the restored session if refreshing the editor fails.
      console.warn("Editor refresh unavailable:", error);
    }
  } catch (error) {
    console.error("Session restore failed:", error);
    clearDisplay("Could not restore the previous session.");
  }
}


// Read the current LeetCode problem.
readBtn.addEventListener("click", async () => {
  if (busy) return;

  readBtn.disabled = true;
  response.textContent = "Reading problem...";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (
      !tab?.id ||
      !tab.url?.startsWith("https://leetcode.com/problems/")
    ) {
      throw new Error("Open a LeetCode problem page first.");
    }

    currentTabId = tab.id;
    currentSessionKey = getSessionKey(currentTabId);

    const stored = await chrome.storage.local.get(currentSessionKey);
    const existingSession = stored[currentSessionKey];

    if (
      existingSession?.problem &&
      normalizeUrl(existingSession.problem.url) === normalizeUrl(tab.url)
    ) {
      displaySession(existingSession);
      response.textContent = existingSession.solution
        ? extractCppCode(existingSession.solution)
        : existingSession.hints?.length
          ? existingSession.hints.join("\n\n--------------------\n\n")
          : "Previous progress restored.";

      return;
    }

    const problem = await chrome.tabs.sendMessage(tab.id, {
      action: "GET_PROBLEM"
    });

    if (!problem?.title || !problem?.description) {
      throw new Error(
        "Could not read the problem. Reload LeetCode and try again."
      );
    }

    
  currentProblem = {
  title: problem.title,
  description: problem.description,
  code: problem.code || "",
  codeSource: problem.codeSource || "none",
  url: tab.url
};


    currentHintLevel = 1;
    savedHints = [];
    savedSolution = "";

    await saveSession();

    displaySession({
      problem: currentProblem,
      attempt: "",
      hintLevel: 1,
      hints: [],
      solution: ""
    });

    response.textContent = "Problem details loaded successfully.";
  } catch (error) {
    response.textContent = error.message;
  } finally {
    readBtn.disabled = false;
  }
});

// Save the user's approach automatically.
attempt.addEventListener("input", () => {
  saveSession().catch(error => {
    console.error("Could not save session:", error);
  });
});

// Generate progressive hints.
hintBtn.addEventListener("click", async () => {
  if (busy) return;

  if (!currentProblem || !currentSessionKey) {
    response.textContent = "Click Read Problem first.";
    return;
  }

  const reasoning = attempt.value.trim();

  if (!reasoning) {
    response.textContent = "Describe what you have tried first.";
    attempt.focus();
    return;
  }

  if (currentHintLevel > 4) {
    response.textContent = "You have viewed all four hint levels.";
    return;
  }

  busy = true;
  hintBtn.disabled = true;
  response.textContent = `Generating hint ${currentHintLevel}...`;

  try {
    await refreshCurrentProblemCode();
await saveSession();

const result = await fetch(`${API_URL}/hint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: currentProblem.title,
        description: currentProblem.description,
        code: currentProblem.code,
        attempt: attempt.value.trim(),
        level: currentHintLevel,
        previousHints: savedHints
      })
    });

    const data = await result.json();

    if (!result.ok) {
      throw new Error(data.error || "Hint request failed.");
    }

    savedHints.push(`Hint ${data.level}\n\n${data.hint}`);
    currentHintLevel++;

    await saveSession();

    response.textContent = savedHints.join(
      "\n\n--------------------\n\n"
    );

    hintBtn.textContent =
      currentHintLevel <= 4
        ? `Get Hint ${currentHintLevel}`
        : "All Hints Viewed";
  } catch (error) {
    response.textContent = `Could not generate hint: ${error.message}`;
  } finally {
    busy = false;
    hintBtn.disabled = currentHintLevel > 4;
  }
});

// Generate the complete C++ solution.
if (solutionBtn) {
  solutionBtn.addEventListener("click", async () => {
    if (busy) return;

    if (!currentProblem || !currentSessionKey) {
      response.textContent = "Click Read Problem first.";
      return;
    }

    busy = true;
    solutionBtn.disabled = true;
    response.textContent = "Generating your C++ solution...";

    try {
      await refreshCurrentProblemCode();
      const result = await fetch(`${API_URL}/solution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: currentProblem.title,
          description: currentProblem.description,
          code: currentProblem.code,
          attempt: attempt.value.trim()
        })
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.error || "Solution request failed.");
      }

      if (!data.solution) {
        throw new Error("The server returned an empty solution.");
      }

      // Keep the complete response for session persistence.
      savedSolution = data.solution;

      await saveSession();

      // Show only the clean C++ code in the popup.
      response.textContent = extractCppCode(savedSolution);

      solutionBtn.textContent = "Full Solution Saved";
    } catch (error) {
      response.textContent =
        `Could not generate solution: ${error.message}`;
    } finally {
      busy = false;
      solutionBtn.disabled = false;
    }
  });
}

restoreSession();
