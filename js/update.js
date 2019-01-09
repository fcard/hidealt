// author: ztrat4dkyle
// source: https://stackoverflow.com/a/50548409/6750494
chrome.tabs.onUpdated.addListener(
  function(tabId, changeInfo, tab) {
    if (changeInfo.url) {
      chrome.tabs.sendMessage(tabId, { updateHideAlt: true, url: changeInfo.url });
    }
  }
);

/*
chrome.webNavigation.onDOMContentLoaded.addListener(
  function(details) {
    if (details.url) {
      chrome.tabs.sendMessage(details.tabId, { updateHideAlt: true });
    }
  }
);
*/
