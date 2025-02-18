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

// Retrieve and set input values from storage
const storageKeys = fields.flatMap(field => [field.id, field.logId]);
browser.storage.sync.get(storageKeys).then(result => {
  fields.forEach(field => {
    document.getElementById(field.id).value = result[field.id] || '';
    document.getElementById(field.logId).checked = result[field.logId] !== undefined ? result[field.logId] : true;
  });
});

// Save input values to storage when they change
fields.forEach(field => {
  document.getElementById(field.id).addEventListener('input', function() {
    const data = {};
    data[field.id] = this.value;
    browser.storage.sync.set(data);
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
    })
    // .catch(() => {
    //   // Content script is not injected, inject it
    //   browser.tabs.executeScript(tabId, {file: 'content.js'}).then(() => {
    //     browser.tabs.sendMessage(tabId, message);
    //   }).catch(error => {
    //     console.error("Failed to inject content script:", error);
    //   });
    // });
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

function displaySavedChapters() {
  const savedChaptersContainer = document.getElementById('savedChaptersContainer');
  savedChaptersContainer.innerHTML = ''; // Clear existing content

  browser.storage.local.get(null).then(items => {
    Object.keys(items).forEach(key => {
      if (key.startsWith("ScrapeStory") && key.includes('_')) {
        const [scrapeStory, storyTitle, author] = key.split('_');
        const storyData = items[key];
        const chapters = storyData;

        const storyHeader = document.createElement('h2');
        const storyToggleButton = createToggleButton();
        storyHeader.appendChild(storyToggleButton);
        storyHeader.appendChild(document.createTextNode(`${storyTitle} by ${author}`));
        storyHeader.classList.add('collapsible');
        savedChaptersContainer.appendChild(storyHeader);

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
          const imagesParentId = `ScrapeImages_${storyTitle}_${author}`;
          const chapterImages = Object.keys(items).filter(imageKey => imageKey.startsWith(`${imagesParentId}/images/${sanitizedChapterTitle}/`));

          const chapterToggleButton = createToggleButton();
          if (chapterImages.length > 0) {
            titleCell.appendChild(chapterToggleButton);
          }
          titleCell.appendChild(document.createTextNode(chapter.title));

          const link = document.createElement('a');
          link.href = chapter.href;
          link.textContent = 'Link';
          link.target = '_blank';
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
              saveReorderedChapters(key, reorderedChapters);
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
            imageContainer.style.display = 'none'; // Initially collapsed

            chapterImages.forEach(imageKey => {
              const imageRow = document.createElement('tr');
              const imageTitle = document.createElement('td');
              const imageColumn = document.createElement('td');
              const imageDisplay = document.createElement('img');

              imageTitle.textContent = imageKey.split('/').pop();
              imageDisplay.src = items[imageKey];
              imageDisplay.alt = imageKey.split('/').pop();
              imageDisplay.style.maxWidth = '100px'; // Set a max width for the image

              imageRow.appendChild(imageTitle);
              imageColumn.appendChild(imageDisplay);
              imageRow.appendChild(imageColumn);
              imageContainer.appendChild(imageRow);
            });

            titleCell.appendChild(imageContainer);

            chapterToggleButton.addEventListener('click', function() {
              imageContainer.style.display = chapterToggleButton.firstChild.src.includes('minus.svg') ? 'block' : 'none';
            });
          }
        });
        storyTable.appendChild(tableBody);
        savedChaptersContainer.appendChild(storyTable);

        storyToggleButton.addEventListener('click', function() {
          storyTable.style.display = storyToggleButton.firstChild.src.includes('minus.svg') ? 'table' : 'none';
        });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', displaySavedChapters);
