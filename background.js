// background service worker - manages default suggestion list and sync
chrome.runtime.onInstalled.addListener(() => {
  const defaults = {
    suggestions: [
      "Thanks! I'll get back to you shortly.",
      "Sounds great — let's do it.",
      "Could you share more details?",
      "Looking forward to it.",
      "On my way.",
      "I'll follow up soon.",
      "Let me check and update you.",
      "Can you confirm the timeline?",
      "Please find attached.",
      "Happy to help!"
    ]
  };
  chrome.storage.sync.get(['suggestions'], (res) => {
    if (!res.suggestions) {
      chrome.storage.sync.set(defaults);
    }
  });
});

// Optional: listen for messages if popup wants to update suggestions
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'getSuggestions') {
    chrome.storage.sync.get(['suggestions'], (res) => {
      if (chrome.runtime.lastError) {
        console.log('Storage error:', chrome.runtime.lastError);
        // Return default suggestions if storage fails
        const defaults = [
          "Thanks! I'll get back to you shortly.",
          "Sounds great — let's do it.",
          "Could you share more details?",
          "Looking forward to it.",
          "On my way.",
          "I'll follow up soon.",
          "Let me check and update you.",
          "Can you confirm the timeline?",
          "Please find attached.",
          "Happy to help!"
        ];
        sendResponse({ suggestions: defaults });
      } else {
        sendResponse({ suggestions: res.suggestions || [] });
      }
    });
    return true; // will respond asynchronously
  }
  if (msg && msg.type === 'setSuggestions') {
    chrome.storage.sync.set({ suggestions: msg.suggestions }, () => {
      if (chrome.runtime.lastError) {
        console.log('Storage error:', chrome.runtime.lastError);
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;
  }
});
