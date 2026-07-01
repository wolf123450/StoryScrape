// Fetch and apply the current Firefox theme
browser.theme.getCurrent().then(theme => {
  console.log(theme.colors);
  for (const [key, value] of Object.entries(theme.colors)) {
    console.log(`${key}: ${value}`);
  }
  document.documentElement.style.setProperty('--popup-bg-color', theme.colors.toolbar || '#ffffff');
  document.documentElement.style.setProperty('--popup-text-color', theme.colors.toolbar_text || '#000000');
  document.documentElement.style.setProperty('--button-bg-color', theme.colors.button || '#0078d7');
  document.documentElement.style.setProperty('--button-text-color', theme.colors.button_primary || '#ffffff');
  document.documentElement.style.setProperty('--button-hover-bg-color', theme.colors.button_hover || '#005a9e');
  
  document.documentElement.style.setProperty('--input-bg-color', theme.colors.toolbar_field || 'rgba(0, 0, 0, .3)');
  document.documentElement.style.setProperty('--input-text-color', theme.colors.toolbar_field_text || 'rgb(251,251,254)');
  document.documentElement.style.setProperty('--input-border-color', theme.colors.toolbar_field_border || 'transparent');
  document.documentElement.style.setProperty('--input-focus-bg-color', theme.colors.toolbar_field_focus || 'rgb(66,65,77)');
  document.documentElement.style.setProperty('--input-border-focus-color', theme.colors.toolbar_field_border_focus || 'transparent');
  document.documentElement.style.setProperty('--input-text-focus-color', theme.colors.toolbar_field_text_focus || 'rgb(251,251,254)');
});

const fields = [
  { id: 'storyTitleSelector', logId: 'logStoryTitleText' },
  { id: 'authorSelector', logId: 'logAuthorText' },
  { id: 'chapterTitleSelector', logId: 'logChapterTitleText' },
  { id: 'chapterBodySelector', logId: 'logChapterBodyText' },
  { id: 'nextButtonSelector', logId: 'logNextButtonText' }
];

const tocFields = [
  { id: 'tocStoryTitleSelector', logId: 'tocLogStoryTitleText' },
  { id: 'tocAuthorSelector', logId: 'tocLogAuthorText' },
  { id: 'tocChapterTitleSelector', logId: 'tocLogChapterTitleText' },
  { id: 'tocChapterBodySelector', logId: 'tocLogChapterBodyText' },
  { id: 'tocLinksSelector', special: 'tocLinkOrder' }
];

// Function to save selector settings
function saveSelectors() {
  const selectorSetTitle = document.getElementById('selectorSetTitle').value.trim();
  if (!selectorSetTitle) {
    alert('Please enter a title for the selector set.');
    return;
  }

  const selectorSettings = {};
  
  // Save fields from active tab
  const activeTab = document.querySelector('.tab-button.active').id;
  if (activeTab === 'nextButtonTab') {
    fields.forEach(field => {
      selectorSettings[field.id] = document.getElementById(field.id).value;
      selectorSettings[field.logId] = document.getElementById(field.logId).checked;
    });
  } else {
    tocFields.forEach(field => {
      selectorSettings[field.id] = document.getElementById(field.id).value;
      if (field.logId) {
        selectorSettings[field.logId] = document.getElementById(field.logId).checked;
      } else if (field.special) {
        selectorSettings[field.special] = document.getElementById(field.special).value;
      }
    });
  }
  
  selectorSettings.activeTab = activeTab;

  browser.storage.sync.get('savedSelectorSets').then(result => {
    const savedSelectorSets = result.savedSelectorSets || {};
    savedSelectorSets[selectorSetTitle] = selectorSettings;
    
    browser.storage.sync.set({ savedSelectorSets }).then(() => {
      alert(`Selector settings saved as "${selectorSetTitle}"`);
    });
  });
}

// Function to load selector settings
function loadSelectors(title) {
  browser.storage.sync.get('savedSelectorSets').then(result => {
    const savedSelectorSets = result.savedSelectorSets || {};
    const settings = savedSelectorSets[title];
    
    if (settings) {
      // Switch to the correct tab first
      if (settings.activeTab) {
        switchTab(settings.activeTab);
      }
      
      // Load the appropriate fields based on the active tab
      if (settings.activeTab === 'nextButtonTab' || !settings.activeTab) {
        fields.forEach(field => {
          document.getElementById(field.id).value = settings[field.id] || '';
          document.getElementById(field.logId).checked = settings[field.logId] !== undefined ? settings[field.logId] : true;
          updateElementFoundStatus(field.id);
        });
      } else {
        tocFields.forEach(field => {
          document.getElementById(field.id).value = settings[field.id] || '';
          if (field.logId) {
            document.getElementById(field.logId).checked = settings[field.logId] !== undefined ? settings[field.logId] : true;
            updateElementFoundStatus(field.id);
          } else if (field.special) {
            document.getElementById(field.special).value = settings[field.special] || 'ascending';
          }
        });
      }
      
      // Save loaded settings to sync storage
      const data = {};
      Object.keys(settings).forEach(key => {
        data[key] = settings[key];
      });
      browser.storage.sync.set(data);
      
      document.getElementById('selectorSetTitle').value = title;
      toggleSavedSelectorsContainer(false); // Hide the container after loading
    }
  });
}

// Function to display saved selector sets
function displaySavedSelectorSets() {
  const selectorSetsList = document.getElementById('selectorSetsList');
  selectorSetsList.innerHTML = ''; // Clear existing content
  
  browser.storage.sync.get('savedSelectorSets').then(result => {
    const savedSelectorSets = result.savedSelectorSets || {};
    
    if (Object.keys(savedSelectorSets).length === 0) {
      selectorSetsList.innerHTML = '<p>No saved selector sets found.</p>';
      return;
    }
    
    const list = document.createElement('ul');
    list.className = 'selector-sets-list';
    
    Object.keys(savedSelectorSets).forEach(title => {
      const listItem = document.createElement('li');
      
      const loadButton = document.createElement('button');
      loadButton.textContent = 'Load';
      loadButton.className = 'selector-set-load-btn';
      loadButton.addEventListener('click', () => loadSelectors(title));
      
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.className = 'selector-set-delete-btn';
      deleteButton.addEventListener('click', () => deleteSelector(title));
      
      const titleSpan = document.createElement('span');
      titleSpan.textContent = title;
      titleSpan.className = 'selector-set-title';
      
      listItem.appendChild(loadButton);
      listItem.appendChild(deleteButton);
      listItem.appendChild(titleSpan);
      list.appendChild(listItem);
    });
    
    selectorSetsList.appendChild(list);
  });
}

// Function to delete a saved selector set
function deleteSelector(title) {
  if (confirm(`Are you sure you want to delete the selector set "${title}"?`)) {
    browser.storage.sync.get('savedSelectorSets').then(result => {
      const savedSelectorSets = result.savedSelectorSets || {};
      
      if (savedSelectorSets[title]) {
        delete savedSelectorSets[title];
        browser.storage.sync.set({ savedSelectorSets }).then(() => {
          displaySavedSelectorSets();
          alert(`Selector set "${title}" has been deleted.`);
        });
      }
    });
  }
}

// Function to toggle the visibility of the saved selectors container
function toggleSavedSelectorsContainer(show) {
  const container = document.getElementById('savedSelectorsContainer');
  container.style.display = show ? 'block' : 'none';
  
  if (show) {
    displaySavedSelectorSets();
  }
}

function updateElementFoundStatus(fieldId) {
  const selector = document.getElementById(fieldId).value;
  browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
    const tabId = tabs[0].id;
    browser.tabs.sendMessage(tabId, { action: 'checkSelector', selector }).then(response => {
      const statusElement = document.getElementById(`${fieldId}Status`);
      if (response && response.found) {
        statusElement.textContent = 'Element found';
        statusElement.style.color = 'green';
      } else {
        statusElement.textContent = 'Element not found';
        statusElement.style.color = 'red';
      }
    }).catch(error => {
      console.error("Error checking selector:", error);
    });
  });
}

// Retrieve and set input values from storage
const storageKeys = fields.flatMap(field => [field.id, field.logId]);
browser.storage.sync.get(storageKeys).then(result => {
  fields.forEach(field => {
    document.getElementById(field.id).value = result[field.id] || '';
    document.getElementById(field.logId).checked = result[field.logId] !== undefined ? result[field.logId] : true;
    updateElementFoundStatus(field.id);
  });
});

// Save input values to storage when they change
fields.forEach(field => {
  document.getElementById(field.id).addEventListener('input', function() {
    const data = {};
    data[field.id] = this.value;
    browser.storage.sync.set(data);
    updateElementFoundStatus(field.id);
  });
  document.getElementById(field.logId).addEventListener('change', function() {
    const data = {};
    data[field.logId] = this.checked;
    browser.storage.sync.set(data);
  });
});

function sendMessageToContentScript(message) {
  browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
    const tabId = tabs[0].id;
    browser.tabs.sendMessage(tabId, {ping: true}).then(() => {
      // Content script is already injected
      browser.tabs.sendMessage(tabId, message);
    }).catch(() => {
      // Content script is not injected, inject it
      browser.tabs.executeScript(tabId, {file: 'content.js'}).then(() => {
        browser.tabs.sendMessage(tabId, message);
      }).catch(error => {
        console.error("Failed to inject content script:", error);
      });
    });
  });
}

document.getElementById('scrapeChapterButton').addEventListener('click', function() {
  const message = { action: 'scrapeOne' };
  fields.forEach(field => {
    message[field.id] = document.getElementById(field.id).value;
    message[field.logId] = document.getElementById(field.logId).checked;
  });
  sendMessageToContentScript(message);
  setTimeout(displaySavedChapters, 500); // Redraw saved chapters after a brief timeout
});

document.getElementById('scrapeForwardButton').addEventListener('click', function() {
  const message = { action: 'scrapeForward' };
  fields.forEach(field => {
    message[field.id] = document.getElementById(field.id).value;
    message[field.logId] = document.getElementById(field.logId).checked;
  });
  sendMessageToContentScript(message);
  setTimeout(displaySavedChapters, 500); // Redraw saved chapters after a brief timeout
});

document.getElementById('downloadButton').addEventListener('click', function() {
  const message = { action: 'downloadEPUB' };
  fields.forEach(field => {
    message[field.id] = document.getElementById(field.id).value;
    message[field.logId] = document.getElementById(field.logId).checked;
  });
  sendMessageToContentScript(message);
});

document.getElementById('resetCacheButton').addEventListener('click', function() {
  browser.storage.local.clear().then(() => {
    console.log("Chapter cache reset.");
    alert("Chapter cache has been reset.");
    setTimeout(displaySavedChapters, 500); // Redraw saved chapters after a brief timeout
  }).catch(error => {
    console.error("Failed to reset chapter cache:", error);
  });
});

// Add event listeners for selector save/load buttons
document.getElementById('saveSelectorsButton').addEventListener('click', saveSelectors);
document.getElementById('loadSelectorsButton').addEventListener('click', function() {
  toggleSavedSelectorsContainer(document.getElementById('savedSelectorsContainer').style.display === 'none');
});

function createToggleButton() {
  const button = document.createElement('button');
  const icon = document.createElement('img');
  icon.src = 'icons/plus.svg';
  icon.alt = 'Expand';
  button.appendChild(icon);
  button.classList.add('toggle-button');
  button.addEventListener('click', function() {
    const isExpanded = icon.src.includes('minus.svg');
    icon.src = isExpanded ? 'icons/plus.svg' : 'icons/minus.svg';
    icon.alt = isExpanded ? 'Expand' : 'Collapse';
    return !isExpanded;
  });
  return button;
}

function moveChapter(chapters, fromIndex, toIndex) {
  const [movedChapter] = chapters.splice(fromIndex, 1);
  chapters.splice(toIndex, 0, movedChapter);
  return chapters;
}

function saveReorderedChapters(storyKey, chapters) {
  const data = {};
  data[storyKey] = chapters;
  browser.storage.local.set(data).then(() => {
    console.log("Chapters reordered and saved.");
    displaySavedChapters();
  }).catch(error => {
    console.error("Failed to save reordered chapters:", error);
  });
}

function downloadEpubForStory(storyTitle, author) {
  console.log(`Downloading EPUB for "${storyTitle}" by ${author}`);
  
  // Create a sanitized filename
  const sanitizedTitle = storyTitle.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
  const sanitizedAuthor = author.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
  const filename = `${sanitizedTitle}_by_${sanitizedAuthor}.epub`;
  
  browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
    const tabId = tabs[0].id;
    browser.tabs.sendMessage(tabId, {
      action: 'downloadEPUB',
      storyTitle: storyTitle,
      author: author,
      filename: filename
    });
  });
}

function displaySavedChapters() {
  const savedChaptersContainer = document.getElementById('savedChaptersContainer');
  savedChaptersContainer.innerHTML = ''; // Clear existing content

  browser.storage.local.get(null).then(items => {
    const stories = {};
    
    // First, collect all stories and their chapters
    Object.keys(items).forEach(key => {
      if (key.startsWith("ScrapeStory_") && key.includes('_')) {
        const [scrapeStory, storyTitle, author] = key.split('_');
        const storyData = items[key];
        
        if (!stories[key]) {
          stories[key] = {
            storyTitle: storyTitle,
            author: author,
            chapters: storyData
          };
        }
      }
    });
    
    // If no stories found
    if (Object.keys(stories).length === 0) {
      const noStoriesMsg = document.createElement('p');
      noStoriesMsg.textContent = "No stories found in the cache. Try scraping some chapters first.";
      savedChaptersContainer.appendChild(noStoriesMsg);
      return;
    }
    
    // Display each story
    Object.keys(stories).forEach(storyKey => {
      const story = stories[storyKey];
      const chapters = story.chapters;
      
      const storyContainer = document.createElement('div');
      storyContainer.className = 'story-container';
      
      const storyHeader = document.createElement('div');
      storyHeader.className = 'story-header';
      
      const storyTitle = document.createElement('h2');
      const storyToggleButton = createToggleButton();
      storyTitle.appendChild(storyToggleButton);
      storyTitle.appendChild(document.createTextNode(`${story.storyTitle} by ${story.author}`));
      storyTitle.classList.add('collapsible');
      
      const downloadButton = document.createElement('button');
      downloadButton.textContent = 'Download EPUB';
      downloadButton.className = 'download-epub-btn';
      downloadButton.addEventListener('click', () => {
        downloadEpubForStory(story.storyTitle, story.author);
      });
      
      const chapterCountSpan = document.createElement('span');
      chapterCountSpan.className = 'chapter-count';
      chapterCountSpan.textContent = `${chapters.length} chapters`;
      
      storyHeader.appendChild(storyTitle);
      storyHeader.appendChild(chapterCountSpan);
      storyHeader.appendChild(downloadButton);
      storyContainer.appendChild(storyHeader);
      
      const storyTable = document.createElement('table');
      storyTable.classList.add('chapterTable');
      storyTable.style.display = 'none'; // Initially collapsed

      const tableHeader = document.createElement('thead');
      tableHeader.innerHTML = `
        <tr>
          <th>Index</th>
          <th>Chapter Title</th>
          <th>Link</th>
          <th>Position</th>
          <th>Move</th>
        </tr>
      `;
      storyTable.appendChild(tableHeader);

      const tableBody = document.createElement('tbody');
      chapters.forEach((chapter, index) => {
        const row = document.createElement('tr');
        const indexCell = document.createElement('td');
        const titleCell = document.createElement('td');
        const linkCell = document.createElement('td');
        const positionCell = document.createElement('td');
        const moveCell = document.createElement('td');

        indexCell.textContent = index;

        // List images for the chapter
        const sanitizedChapterTitle = chapter.title.replace(/\s+/g, '_').replace(/:/g, '');
        const imagesParentId = `ScrapeImages_${story.storyTitle}_${story.author}`;
        const chapterImages = Object.keys(items).filter(imageKey => imageKey.startsWith(`${imagesParentId}/images/${sanitizedChapterTitle}/`));

        const chapterToggleButton = createToggleButton();
        if (chapterImages.length > 0) {
          titleCell.appendChild(chapterToggleButton);
          titleCell.appendChild(document.createTextNode(`${chapter.title} (${chapterImages.length} images)`));
        } else {
          titleCell.appendChild(document.createTextNode(chapter.title));
        }

        const link = document.createElement('a');
        link.href = chapter.href || '#';
        link.textContent = chapter.href ? 'Link' : 'No Link';
        if (chapter.href) {
          link.target = '_blank';
        } else {
          link.style.color = 'gray';
          link.style.textDecoration = 'none';
          link.style.cursor = 'default';
        }
        linkCell.appendChild(link);

        const positionInput = document.createElement('input');
        positionInput.type = 'number';
        positionInput.value = index;
        positionInput.min = 0;
        positionInput.max = chapters.length - 1;
        positionCell.appendChild(positionInput);

        const moveButton = document.createElement('button');
        moveButton.textContent = 'Move';
        moveButton.addEventListener('click', () => {
          const newIndex = parseInt(positionInput.value, 10);
          if (newIndex >= 0 && newIndex < chapters.length) {
            const reorderedChapters = moveChapter([...chapters], index, newIndex);
            saveReorderedChapters(storyKey, reorderedChapters);
          }
        });
        moveCell.appendChild(moveButton);

        row.appendChild(indexCell);
        row.appendChild(titleCell);
        row.appendChild(linkCell);
        row.appendChild(positionCell);
        row.appendChild(moveCell);
        tableBody.appendChild(row);
        
        if (chapterImages.length > 0) {
          const imageContainer = document.createElement('tbody');
          imageContainer.className = 'image-container';
          imageContainer.style.display = 'none'; // Initially collapsed

          chapterImages.forEach(imageKey => {
            const imageRow = document.createElement('tr');
            imageRow.className = 'image-row';
            
            const imageTitle = document.createElement('td');
            imageTitle.colSpan = "2";
            imageTitle.textContent = imageKey.split('/').pop();
            
            const imageColumn = document.createElement('td');
            imageColumn.colSpan = "3";
            const imageDisplay = document.createElement('img');

            imageDisplay.src = items[imageKey];
            imageDisplay.alt = imageKey.split('/').pop();
            imageDisplay.style.maxWidth = '100px'; // Set a max width for the image

            imageRow.appendChild(imageTitle);
            imageColumn.appendChild(imageDisplay);
            imageRow.appendChild(imageColumn);
            imageContainer.appendChild(imageRow);
          });

          tableBody.appendChild(imageContainer);

          chapterToggleButton.addEventListener('click', function() {
            const isExpanded = this.querySelector('img').src.includes('minus.svg');
            imageContainer.style.display = isExpanded ? 'table-row-group' : 'none';
          });
        }
      });
      storyTable.appendChild(tableBody);
      storyContainer.appendChild(storyTable);
      savedChaptersContainer.appendChild(storyContainer);

      storyToggleButton.addEventListener('click', function() {
        const isExpanded = this.querySelector('img').src.includes('minus.svg');
        storyTable.style.display = isExpanded ? 'table' : 'none';
      });
    });
  });
}

// Update the old download button to work with the currently active story
document.getElementById('downloadButton').addEventListener('click', function() {
  browser.storage.local.get(null).then(items => {
    // Find the first story in storage
    const storyKey = Object.keys(items).find(key => key.startsWith("ScrapeStory_"));
    if (storyKey) {
      const [_, storyTitle, author] = storyKey.split('_');
      downloadEpubForStory(storyTitle, author);
    } else {
      alert("No stories found to download. Please scrape some chapters first.");
    }
  });
});

// Function to extract TOC links and show preview
function extractTocLinks() {
  const tocLinksSelector = document.getElementById('tocLinksSelector').value;
  const ascending = document.getElementById('tocLinkOrder').value === 'ascending';
  
  if (!tocLinksSelector) {
    alert('Please enter a selector for TOC chapter links.');
    return;
  }
  
  browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
    const tabId = tabs[0].id;
    browser.tabs.sendMessage(tabId, { 
      action: 'extractTocLinks', 
      tocSelector: tocLinksSelector,
      ascending: ascending
    }).then(response => {
      const linksList = document.getElementById('tocLinksList');
      linksList.innerHTML = '';
      
      const linksCount = document.getElementById('tocLinksCount');
      
      if (response && response.links && response.links.length > 0) {
        linksCount.textContent = `Found ${response.links.length} chapter links`;
        linksCount.style.color = 'green';
        
        // Show a preview of the first 10 links
        const previewCount = Math.min(10, response.links.length);
        for (let i = 0; i < previewCount; i++) {
          const link = response.links[i];
          const listItem = document.createElement('li');
          listItem.textContent = `${i+1}. ${link.title}`;
          listItem.title = link.url;
          linksList.appendChild(listItem);
        }
        
        if (response.links.length > 10) {
          const moreItem = document.createElement('li');
          moreItem.textContent = `... and ${response.links.length - 10} more`;
          linksList.appendChild(moreItem);
        }
      } else {
        linksCount.textContent = 'No chapter links found';
        linksCount.style.color = 'red';
      }
    }).catch(error => {
      console.error("Error extracting TOC links:", error);
    });
  });
}

// Function to scrape all chapters from TOC
function scrapeTocChapters() {
  const tocLinksSelector = document.getElementById('tocLinksSelector').value;
  const ascending = document.getElementById('tocLinkOrder').value === 'ascending';
  
  if (!tocLinksSelector) {
    alert('Please enter a selector for TOC chapter links.');
    return;
  }

  console.log(tocLinksSelector);
  
  browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
    const tabId = tabs[0].id;
    browser.tabs.sendMessage(tabId, { 
      action: 'extractTocLinks', 
      tocSelector: tocLinksSelector,
      ascending: ascending
    }).then(response => {
      if (response && response.links && response.links.length > 0) {
        const links = response.links;
        const progressBar = document.getElementById('tocProgressBar');
        const progressText = document.querySelector('.progress-text');
        
        progressBar.max = links.length;
        progressBar.value = 0;
        progressText.textContent = `Progress: 0/${links.length} chapters`;
        
        // Prepare the message for chapter scraping
        const message = { action: 'scrapeOne' };
        
        // Map TOC fields to regular fields for the content script
        tocFields.forEach(field => {
          if (field.id !== 'tocLinksSelector') {
            // Create a mapping table for field conversion
            const fieldMap = {
              'tocStoryTitleSelector': 'storyTitleSelector',
              'tocAuthorSelector': 'authorSelector',
              'tocChapterTitleSelector': 'chapterTitleSelector',
              'tocChapterBodySelector': 'chapterBodySelector',
              'tocLogStoryTitleText': 'logStoryTitleText',
              'tocLogAuthorText': 'logAuthorText',
              'tocLogChapterTitleText': 'logChapterTitleText',
              'tocLogChapterBodyText': 'logChapterBodyText'
            };
            
            if (field.id in fieldMap) {
              const regularFieldId = fieldMap[field.id];
              const selectorValue = document.getElementById(field.id).value;
              message[regularFieldId] = selectorValue;
              
              console.log(`Mapping ${field.id} → ${regularFieldId}: ${selectorValue}`);
            }
            
            if (field.logId && field.logId in fieldMap) {
              const regularLogId = fieldMap[field.logId];
              const logChecked = document.getElementById(field.logId).checked;
              message[regularLogId] = logChecked;
              
              console.log(`Mapping ${field.logId} → ${regularLogId}: ${logChecked}`);
            }
          }
        });
        
        console.log("Final message for chapter scraping:", message);
        
        // Process chapters sequentially to avoid overwhelming the browser
        processChapters(links, message, 0, progressBar, progressText);
      } else {
        alert('No chapter links found. Please check your TOC selector.');
      }
    }).catch(error => {
      console.error("Error extracting TOC links:", error);
    });
  });
}

// Process chapters one by one
function processChapters(links, message, index, progressBar, progressText) {
  if (index >= links.length) {
    alert('All chapters have been scraped!');
    setTimeout(displaySavedChapters, 500);
    return;
  }
  
  progressText.textContent = `Progress: ${index + 1}/${links.length} chapters`;
  progressBar.value = index + 1;

  // Log detailed information for debugging
  console.log(`Processing chapter ${index + 1}/${links.length}: ${links[index].title}`);
  console.log(`Chapter URL: ${links[index].url}`);
  console.log(`Using selectors:`, message);
  
  // Get debug checkbox state
  const debugFirstChapter = document.getElementById('debugFirstChapter').checked;
  
  browser.runtime.sendMessage({
    action: 'openChapter',
    url: links[index].url,
    chapterInfo: {
      index: index,
      title: links[index].title,
      message: message,
      debug: index === 0 && debugFirstChapter // Only debug first chapter if checkbox is checked
    }
  }).then(response => {
    console.log(`Chapter ${index + 1} result:`, response);
    
    // Check if the chapter was scraped successfully
    if (!response || !response.success) {
      const errorMsg = response ? 
        (response.errors && response.errors.length > 0 ? response.errors[0] : "Unknown error") : 
        "Unknown error";
      
      console.error(`Failed to scrape chapter ${index + 1}: ${errorMsg}`);
      
      // If there's debug data, log it for troubleshooting
      if (response && response.debugData) {
        console.log("Debug data for failed chapter:", response.debugData);
        
        // Add error information to the progress text
        progressText.innerHTML = `Progress: ${index + 1}/${links.length} chapters - <span style="color:red">Error: ${errorMsg}</span>`;
      }
    }
    
    // Process next chapter after a short delay
    setTimeout(() => {
      processChapters(links, message, index + 1, progressBar, progressText);
    }, 1000); // Increased delay to give more time for processing
  }).catch(error => {
    console.error(`Error processing chapter ${index + 1}:`, error);
    progressText.innerHTML = `Progress: ${index + 1}/${links.length} chapters - <span style="color:red">Error: ${error.message || error}</span>`;
    
    // Continue with next chapter even if there was an error
    setTimeout(() => {
      processChapters(links, message, index + 1, progressBar, progressText);
    }, 1000); // Increased delay to give more time for processing
  });
}

// Function to switch between tabs
function switchTab(tabId) {
  // Hide all tab contents
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    content.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  // Activate the selected tab
  document.getElementById(tabId).classList.add('active');
  document.getElementById(`${tabId}Content`).classList.add('active');
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', function() {
  displaySavedChapters();
  // Reset the saved selectors container to hidden on load
  document.getElementById('savedSelectorsContainer').style.display = 'none';
  
  // Set up tab switching
  document.getElementById('nextButtonTab').addEventListener('click', function() {
    switchTab('nextButtonTab');
  });
  
  document.getElementById('tocTab').addEventListener('click', function() {
    switchTab('tocTab');
  });
  
  // Set up TOC-specific event listeners
  document.getElementById('extractTocLinksButton').addEventListener('click', extractTocLinks);
  document.getElementById('scrapeTocButton').addEventListener('click', scrapeTocChapters);
  
  // Set up event listeners for TOC field changes
  tocFields.forEach(field => {
    if (field.id !== 'tocLinksSelector') {
      document.getElementById(field.id).addEventListener('input', function() {
        const data = {};
        data[field.id] = this.value;
        browser.storage.sync.set(data);
        updateElementFoundStatus(field.id);
      });
      
      if (field.logId) {
        document.getElementById(field.logId).addEventListener('change', function() {
          const data = {};
          data[field.logId] = this.checked;
          browser.storage.sync.set(data);
        });
      }
    } else {
      document.getElementById(field.id).addEventListener('input', function() {
        const data = {};
        data[field.id] = this.value;
        browser.storage.sync.set(data);
      });
      
      document.getElementById(field.special).addEventListener('change', function() {
        const data = {};
        data[field.special] = this.value;
        browser.storage.sync.set(data);
      });
    }
  });
  
  // Load saved TOC fields from storage
  const tocStorageKeys = tocFields.flatMap(field => {
    if (field.special) {
      return [field.id, field.special];
    } else if (field.logId) {
      return [field.id, field.logId];
    } else {
      return [field.id];
    }
  });
  
  browser.storage.sync.get(tocStorageKeys).then(result => {
    tocFields.forEach(field => {
      document.getElementById(field.id).value = result[field.id] || '';
      if (field.logId) {
        document.getElementById(field.logId).checked = result[field.logId] !== undefined ? result[field.logId] : true;
        updateElementFoundStatus(field.id);
      } else if (field.special) {
        document.getElementById(field.special).value = result[field.special] || 'ascending';
      }
    });
  });
  
  // Load debug checkbox state from storage
  browser.storage.sync.get('debugFirstChapter').then(result => {
    document.getElementById('debugFirstChapter').checked = result.debugFirstChapter || false;
  });
  
  // Save debug checkbox state when changed
  document.getElementById('debugFirstChapter').addEventListener('change', function() {
    browser.storage.sync.set({ debugFirstChapter: this.checked });
  });
});
