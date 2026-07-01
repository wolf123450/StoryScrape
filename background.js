console.log("Background script loaded.");

// Handle messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openChapter') {
    return new Promise((resolve) => {
      // Open a new tab with the chapter URL
      browser.tabs.create({ url: message.url, active: false }).then(tab => {
        // Wait for the tab to finish loading
        browser.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            // Tab has finished loading, now scrape the content
            browser.tabs.onUpdated.removeListener(listener);
            
            // Slight delay to ensure page is fully rendered
            setTimeout(() => {
              browser.tabs.sendMessage(tab.id, {
                action: 'processChapterInTab',
                chapterInfo: message.chapterInfo
              }).then(result => {
                // Check if there was an error or if debugging is needed
                if (!result || !result.success || (message.chapterInfo && message.chapterInfo.debug)) {
                  console.log("Keeping tab open for debugging for 60 seconds:", tab.id);
                  
                  // Make the tab active so you can see it
                  browser.tabs.update(tab.id, { active: true });
                  
                  // Add a visual indicator that the tab will close
                  browser.tabs.executeScript(tab.id, {
                    code: `
                      const debugDiv = document.createElement('div');
                      debugDiv.style.position = 'fixed';
                      debugDiv.style.top = '0';
                      debugDiv.style.left = '0';
                      debugDiv.style.right = '0';
                      debugDiv.style.padding = '10px';
                      debugDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
                      debugDiv.style.color = 'white';
                      debugDiv.style.zIndex = '9999';
                      debugDiv.style.textAlign = 'center';
                      debugDiv.textContent = 'StoryScrape Debug Mode: This tab will close in 60 seconds';
                      document.body.appendChild(debugDiv);
                    `
                  });
                  
                  // Close the tab after a longer delay (60 seconds)
                  setTimeout(() => {
                    browser.tabs.remove(tab.id).then(() => {
                      console.log("Chapter processing result:", result);
                      resolve(result);
                    });
                  }, 60000); // 60 seconds
                } else {
                  // No error, close the tab immediately
                  browser.tabs.remove(tab.id).then(() => {
                    console.log("Chapter processing result:", result);
                    resolve(result);
                  });
                }
              }).catch(error => {
                console.error("Error processing chapter in tab:", error);
                
                // Make the tab active so you can see the error
                browser.tabs.update(tab.id, { active: true });
                
                // Add a visual indicator that the tab will close
                browser.tabs.executeScript(tab.id, {
                  code: `
                    const errorDiv = document.createElement('div');
                    errorDiv.style.position = 'fixed';
                    errorDiv.style.top = '0';
                    errorDiv.style.left = '0';
                    errorDiv.style.right = '0';
                    errorDiv.style.padding = '10px';
                    errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
                    errorDiv.style.color = 'white';
                    errorDiv.style.zIndex = '9999';
                    errorDiv.style.textAlign = 'center';
                    errorDiv.textContent = 'StoryScrape Error: ' + '${error.toString()}' + '. This tab will close in 60 seconds';
                    console.error("StoryScrape Error:", '${error.toString()}');
                    document.body.appendChild(errorDiv);
                  `
                });
                
                // Close the tab after a longer delay (60 seconds)
                setTimeout(() => {
                  browser.tabs.remove(tab.id).then(() => {
                    resolve({ 
                      success: false, 
                      error: error.toString(),
                      errors: [`Error in tab processing: ${error.toString()}`]
                    });
                  });
                }, 60000); // 60 seconds
              });
            }, 1000);
          }
        });
      }).catch(error => {
        console.error("Error creating tab:", error);
        resolve({ success: false, error: error.toString() });
      });
    });
  }
});
