/**
 * Background service worker for Read Aloud Pro extension
 * Handles context menu creation and messaging between components
 */

// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for reading selected text
  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Read selected text",
    contexts: ["selection"]
  });

  // Create context menu for reading from this text onwards
  chrome.contextMenus.create({
    id: "readFromHere",
    title: "Read from this text onwards",
    contexts: ["all"]
  });

  // Initialize default settings if not already set
  chrome.storage.sync.get(["speechRate", "speechPitch", "selectedVoiceURI", "playbackVolume"], (result) => {
    if (result.speechRate === undefined) {
      chrome.storage.sync.set({ speechRate: 1.0 });
    }
    if (result.speechPitch === undefined) {
      chrome.storage.sync.set({ speechPitch: 1.0 });
    }
    if (result.selectedVoiceURI === undefined) {
      chrome.storage.sync.set({ selectedVoiceURI: "" });
    }
    if (result.playbackVolume === undefined) {
      chrome.storage.sync.set({ playbackVolume: 1.0 });
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText" && info.selectionText) {
    // Send message to content script to read selected text
    chrome.tabs.sendMessage(tab.id, {
      action: "readSelectedText",
      text: info.selectionText
    });
  } else if (info.menuItemId === "readFromHere") {
    // Send message to content script to read from clicked position
    chrome.tabs.sendMessage(tab.id, {
      action: "readFromHere"
    });
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle start reading request from popup
  if (message.action === "startReading") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "startReading"
        });
      }
    });
    return true;
  }
  
  // Handle stop reading request
  if (message.action === "stopReading") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "stopReading"
        });
      }
    });
    return true;
  }
  
  // Handle get settings request
  if (message.action === "getSettings") {
    chrome.storage.sync.get(["speechRate", "speechPitch", "selectedVoiceURI", "playbackVolume"], (result) => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for the async response
  }
  
  // Handle save settings request
  if (message.action === "saveSettings") {
    chrome.storage.sync.set({
      speechRate: message.settings.speechRate,
      speechPitch: message.settings.speechPitch,
      selectedVoiceURI: message.settings.selectedVoiceURI,
      playbackVolume: message.settings.playbackVolume
    }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for the async response
  }
});
