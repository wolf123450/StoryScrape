browser.browserAction.onClicked.addListener(function(tab) {
  browser.tabs.sendMessage(tab.id, { action: 'startScraping' }).catch(error => {
    console.error("Failed to send message to content script:", error);
  });
});
