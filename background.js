chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "askAI",
    title: "Ask AI to...",
    contexts: ["editable"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "askAI") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "openAIPrompt"}, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError.message);
          injectContentScriptAndSendMessage(tabs[0].id);
        } else if (response && response.success) {
          console.log("Message sent successfully");
        }
      });
    });
  }
});

function injectContentScriptAndSendMessage(tabId) {
  chrome.scripting.executeScript({
    target: {tabId: tabId},
    files: ['content.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error injecting script:", chrome.runtime.lastError.message);
    } else {
      chrome.tabs.sendMessage(tabId, {action: "openAIPrompt"}, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending message after injection:", chrome.runtime.lastError.message);
        } else if (response && response.success) {
          console.log("Message sent successfully after injection");
        }
      });
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkConfig") {
    chrome.storage.sync.get(["apiKey", "theme"], (result) => {
      if (!result.apiKey) {
        chrome.runtime.openOptionsPage();
        sendResponse({ configured: false });
      } else {
        sendResponse({ configured: true, theme: result.theme || "system" });
      }
    });
    return true;
  }
});