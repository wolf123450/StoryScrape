if (window.storyScrapeInjected) {
  console.log("StoryScrape content script already injected.");
} else {
  window.storyScrapeInjected = true;
  console.log("StoryScrape content script loaded.");

  function logElement(selector, elementName, logTextContent = true) {
    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        if (logTextContent) {
          console.log(`${elementName} Element:`, element.textContent);
          return element.textContent;
        } else {
          console.log(`${elementName} Element:`, element.outerHTML);
          return element.outerHTML;
        }
      } else {
        console.log(`${elementName} Element not found.`);
      }
    } else {
      console.log(`${elementName} Selector is empty.`);
    }
    return null;
  }

  function saveChapter(chapter) {
    console.log("Saving Chapter:", chapter);
    const parentID = `${chapter.storyTitle}_${chapter.author}`;
    const chapterID = `${chapter.title}`;
    const imagePromises = [];

    // Find and process image tags in the chapter body
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chapter.body;
    const images = tempDiv.querySelectorAll('img');

    images.forEach((img, index) => {
      const imageUrl = img.src.toString();
      const imageExtension = imageUrl.split('.').pop().split(/\#|\?/)[0];
      const imageName = `image${index + 1}.${imageExtension}`;
      const imagePath = `${parentID}/images/${chapterID}/${imageName}`;

      // Log all vars so far
      console.log("Image URL:", imageUrl);
      console.log("Image Extension:", imageExtension);
      console.log("Image Name:", imageName);
      console.log("Image Path:", imagePath);


      imagePromises.push(
        fetch(imageUrl)
          .then(response => response.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const base64data = reader.result;
              const data = {};
              data[imagePath] = base64data;
              browser.storage.local.set(data);
            };
          })
          .catch(error => console.error("Failed to download image:", error))
      );

      // Update the image tag reference in the chapter body
      img.src = `images/${chapterID}/${imageName}`;
    });

    Promise.all(imagePromises).then(() => {
      chapter.body = tempDiv.innerHTML;
      chapter.href = window.location.href; // Save the href of the page scraped
      browser.storage.local.get(parentID).then(result => {
        let chapters = result[parentID] || [];
        // Replace existing chapter if it shares the same storyTitle, author, and chapterTitle
        const existingChapterIndex = chapters.findIndex(c => c.title === chapter.title);
        if (existingChapterIndex !== -1) {
          chapters[existingChapterIndex] = chapter;
        } else {
          chapters.push(chapter);
        }
        const data = {};
        data[parentID] = chapters;
        browser.storage.local.set(data);
      });
      browser.storage.local.get(null).then((items) => {
        console.log(items);
      });
    });
  }

  function createEPUB(message) {
    console.log("Creating EPUB file...");
    const storyTitle = logElement(message.storyTitleSelector, "Story Title", message.logStoryTitleText);
    const author = logElement(message.authorSelector, "Author", message.logAuthorText);
    const parentID = `${storyTitle}_${author}`;
    
    browser.storage.local.get(parentID).then(result => {
      const chapters = result[parentID] || [];
      console.log("Chapters:", chapters);
      const zip = new JSZip();
      const epub = zip.folder("EPUB");

      // Add chapters to the EPUB
      chapters.forEach((chapter, index) => {
        console.log(`Adding Chapter ${chapter.title} to EPUB...`);
        epub.file(`chapter${index + 1}.xhtml`, `
          <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <title>${chapter.title}</title>
            </head>
            <body>
              <h1 id="chapter${index + 1}">${chapter.title}</h1>
              <div>${chapter.body}</div>
            </body>
          </html>
        `);
      });

      // Add images to the EPUB
      browser.storage.local.get(null).then(items => {
        Object.keys(items).forEach(key => {
          if (key.startsWith(`${parentID}/images/`)) {
            const imageName = key.split('/').pop();
            const base64data = items[key].split(',')[1];
            const mimeType = items[key].split(';')[0].split(':')[1];
            epub.file(`images/${imageName}`, base64data, { base64: true, binary: true, mimeType });
          }
        });

        // Add the EPUB structure files (mimetype, META-INF/container.xml, etc.)
        zip.file("mimetype", "application/epub+zip");
        zip.folder("META-INF").file("container.xml", `
          <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
            <rootfiles>
              <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
            </rootfiles>
          </container>
        `);

        epub.file("package.opf", `
          <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
            <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
              <dc:title>${storyTitle}</dc:title>
              <dc:creator>${author}</dc:creator>
              <dc:language>en</dc:language>
            </metadata>
            <manifest>
              ${chapters.map((_, index) => `<item id="chapter${index + 1}" href="chapter${index + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("\n")}
              ${Object.keys(items).filter(key => key.startsWith(`${parentID}/images/`)).map(key => {
                const imageName = key.split('/').pop();
                const mimeType = items[key].split(';')[0].split(':')[1];
                return `<item id="${imageName}" href="images/${imageName}" media-type="${mimeType}"/>`;
              }).join("\n")}
            </manifest>
            <spine>
              ${chapters.map((_, index) => `<itemref idref="chapter${index + 1}"/>`).join("\n")}
            </spine>
            <guide>
              ${chapters.map((chapter, index) => `<reference type="text" title="${chapter.title}" href="chapter${index + 1}.xhtml#chapter${index + 1}"/>`).join("\n")}
            </guide>
          </package>
        `);

        // Generate the EPUB file and trigger the download
        zip.generateAsync({ type: "blob" }).then((content) => {
          saveAs(content, "story.epub");
        });
      });
    });
  }

  function scrapeChapter(message) {
    const chapter = {
      storyTitle: logElement(message.storyTitleSelector, "Story Title", message.logStoryTitleText),
      author: logElement(message.authorSelector, "Author", message.logAuthorText),
      title: logElement(message.chapterTitleSelector, "Chapter Title", message.logChapterTitleText),
      body: logElement(message.chapterBodySelector, "Chapter Body", message.logChapterBodyText)
    };

    if (chapter.title && chapter.body) {
      saveChapter(chapter);
    }
  }

  function navigateToNextChapter(message) {
    if (message.nextButtonSelector) {
      const nextButtonElement = document.querySelector(message.nextButtonSelector);
      if (nextButtonElement) {
        const nextHref = nextButtonElement.tagName.toLowerCase() === 'a' ? nextButtonElement.href : window.location.href;
        browser.storage.local.set({ expectedNavigationHref: nextHref, isScraping: true }).then(() => {
          if (nextButtonElement.tagName.toLowerCase() === 'a') {
            window.location.href = nextButtonElement.href;
          } else {
            nextButtonElement.click();
          }
          console.log("Navigating to next chapter...");
        });
      } else {
        console.log("Next Button Element not found.");
      }
    }
  }

  function checkAndContinueScraping() {
    browser.storage.local.get(['expectedNavigationHref', 'isScraping', 'lastMessage']).then(result => {
      if (result.isScraping && result.expectedNavigationHref === window.location.href) {
        browser.storage.local.set({ expectedNavigationHref: null, isScraping: false }).then(() => {
          const lastMessage = result.lastMessage;
          if (lastMessage) {
            scrapeChapter(lastMessage);
            navigateToNextChapter(lastMessage);
          }
        });
      }
    });
  }

  checkAndContinueScraping();

  browser.runtime.onMessage.addListener((message) => {
    console.log("Selectors:", message);
    // Save last message in cache
    browser.storage.local.set({ lastMessage: message });

    if (message.action === 'downloadEPUB') {
      createEPUB(message);
      return;
    }

    if (message.action === 'scrapeForward') {
      scrapeChapter(message);
      navigateToNextChapter(message);
    }

    if (message.action === 'scrapeOne') {
      scrapeChapter(message);
    }
  });
}
