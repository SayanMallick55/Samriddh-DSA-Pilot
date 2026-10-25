
const STORAGE_PREFIX = "dsaCopilotSession:";

chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    // Read the session associated with each LeetCode problem.
    const sessions = await chrome.storage.local.get(null);
    const keysToDelete = [];

    for (const [key, session] of Object.entries(sessions)) {
      if (!key.startsWith(STORAGE_PREFIX)) {
        continue;
      }

      // Delete only sessions associated with the closed tab.
      if (session.tabId === tabId) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      await chrome.storage.local.remove(keysToDelete);
      console.log("Deleted closed-tab sessions:", keysToDelete);
    }
  } catch (error) {
    console.error("Could not clear the closed-tab session:", error);
  }
});
