// Background script to handle sidebar functionality

// Open the side panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Set the side panel as open by default for all URLs
chrome.sidePanel.setOptions({
  enabled: true,
  path: "sidebar.html"
});

// Listen for messages from content script or sidebar
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "getPageContent") {
    // Execute content script to extract page content
    const injection = await chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      files: ["scripts/extract-content.js"],
    });

    chrome.runtime.sendMessage({
      action: "pageContentExtracted",
      data: injection[0].result.content
    });
  }
});
