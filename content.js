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

  function fixSelfClosingTags(xhtml) {
    return xhtml.replace(/<img([^>]*?)(?<!\/)>/g, "<img$1 />");  // Fix self-closing img tags
  }

  function fixXHTMLEntities(xhtml) {
    return xhtml.replace(/&nbsp;/g, "&#160;");  // Replace &nbsp; with &#160; to prevent XML parsing errors
}

  function saveChapter(chapter) {
    console.log("Saving Chapter:", chapter);
    const parentID = `ScrapeStory_${chapter.storyTitle}_${chapter.author}`;
    const imagesParentId = `ScrapeImages_${chapter.storyTitle}_${chapter.author}`;
    const chapterID = `${chapter.title}`;
    const imagePromises = [];
    const errors = [];

    // Find and process image tags in the chapter body
    const parser = new DOMParser();
    const fixedXHTML = fixXHTMLEntities(fixSelfClosingTags(chapter.body));
    const tempDoc = parser.parseFromString(fixedXHTML, 'application/xhtml+xml'); // Parse as XHTML
    const images = tempDoc.querySelectorAll('img');

    images.forEach((img, index) => {
      const imageUrl = img.getAttribute('src');
      const imageExtension = imageUrl.split('.').pop().split(/\#|\?/)[0];
      const imageName = `image${index + 1}.${imageExtension}`.replace(/\s+/g, '_').replace(/:/g, '');  // Colons fuck up windows
      const imagePath = `${chapterID}/${imageName}`.replace(/\s+/g, '_').replace(/:/g, '');

      // Log all vars so far
      console.log("Image URL:", imageUrl);
      console.log("Image Extension:", imageExtension);
      console.log("Image Name:", imageName);
      console.log("Image Path:", imagePath);

      img.setAttribute('src', `images/${imagePath}`); // Update img.src after storing the image

      imagePromises.push(
        fetch(imageUrl) // Ensure fetch uses the original imageUrl
          .then(response => response.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const base64data = reader.result;
              const data = {};
              data[`${imagesParentId}/images/${imagePath}`] = base64data;
              console.log(base64data.length);
              console.log(data[`${imagesParentId}/images/${imagePath}`].length);
              browser.storage.local.set(data);
            };
          })
          .catch(error => {
            console.error("Failed to download image:", error);
            errors.push(`Failed to download image: ${imageUrl}`);
          })
      );
    });

    Promise.all(imagePromises).then(() => {
      chapter.body = tempDoc.documentElement.outerHTML;;
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
    return errors;
  }

  function createEPUB(message) {
    console.log("Creating EPUB file...");
    const storyTitle = logElement(message.storyTitleSelector, "Story Title", message.logStoryTitleText);
    const author = logElement(message.authorSelector, "Author", message.logAuthorText);
    const parentID = `ScrapeStory_${storyTitle}_${author}`;
    const imagesParentId = `ScrapeImages_${storyTitle}_${author}`;
    const uniqueIdentifier = `urn:uuid:${parentID}`;

    browser.storage.local.get(parentID).then(result => {
      const chapters = result[parentID] || [];
      console.log("Chapters:", chapters);
      const zip = new JSZip();
      const epub = zip.folder("OEBPS");

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
          if (key.startsWith(`${imagesParentId}/images/`)) {
            const imagePathParts = key.split('/');
            console.log(imagePathParts);
            const chapterID = imagePathParts[2];
            const imageName = imagePathParts[3];
            const base64data = items[key].split(',')[1];
            const mimeType = items[key].split(';')[0].split(':')[1];
            epub.folder(`images/${chapterID}`).file(imageName, base64data, { base64: true, binary: true, mimeType });
          }
        });

        // Add the EPUB structure files (mimetype, META-INF/container.xml, etc.)
        zip.file("mimetype", "application/epub+zip");
        zip.folder("META-INF").file("container.xml", `
          <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
            <rootfiles>
              <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
            </rootfiles>
          </container>
        `);

        epub.file("package.opf", `
          <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
            <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
              <dc:identifier id="bookid">${uniqueIdentifier}</dc:identifier>
              <dc:title>${storyTitle}</dc:title>
              <dc:creator>${author}</dc:creator>
              <dc:language>en</dc:language>
            </metadata>
            <manifest>
              <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
              <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
              ${chapters.map((_, index) => `<item id="chapter${index + 1}" href="chapter${index + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("\n")}
              ${Object.keys(items).filter(key => key.startsWith(`${imagesParentId}/images/`)).map(key => {
                const imagePathParts = key.split('/');
                const chapterID = imagePathParts[2];
                const imageName = imagePathParts[3];
                const mimeType = items[key].split(';')[0].split(':')[1];
                return `<item id="${imageName}" href="images/${chapterID}/${imageName}" media-type="${mimeType}"/>`;
              }).join("\n")}
            </manifest>
            <spine toc="ncx">
              <itemref idref="nav"/>
              ${chapters.map((_, index) => `<itemref idref="chapter${index + 1}"/>`).join("\n")}
            </spine>
            <guide>
              ${chapters.map((chapter, index) => `<reference type="text" title="${chapter.title}" href="chapter${index + 1}.xhtml#chapter${index + 1}"/>`).join("\n")}
            </guide>
          </package>
        `);

        epub.file("nav.xhtml", `
          <html xmlns="http://www.w3.org/1999/xhtml"
                xmlns:epub="http://www.idpf.org/2007/ops">
            <head>
              <title>Table of Contents</title>
            </head>
            <body>
              <nav epub:type="toc" id="toc">
                <h1>Table of Contents</h1>
                <ol>
                  ${chapters.map((chapter, index) => `<li><a href="chapter${index + 1}.xhtml#chapter${index + 1}">${chapter.title}</a></li>`).join("\n")}
                </ol>
              </nav>
            </body>
          </html>
        `);

        epub.file("toc.ncx", `
          <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
            <head>
              <meta name="dtb:uid" content="${uniqueIdentifier}"/>
              <meta name="dtb:depth" content="1"/>
              <meta name="dtb:totalPageCount" content="0"/>
              <meta name="dtb:maxPageNumber" content="0"/>
            </head>
            <docTitle>
              <text>${storyTitle}</text>
            </docTitle>
            <docAuthor>
              <text>${author}</text>
            </docAuthor>
            <navMap>
              ${chapters.map((chapter, index) => `
                <navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
                  <navLabel>
                    <text>${chapter.title}</text>
                  </navLabel>
                  <content src="chapter${index + 1}.xhtml#chapter${index + 1}"/>
                </navPoint>
              `).join("\n")}
            </navMap>
          </ncx>
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
      return saveChapter(chapter);
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
      errors = scrapeChapter(message);
      if (errors.length > 0) {
        console.error("Errors occurred while scraping chapter:", errors);
      } else {
        navigateToNextChapter(message);
      }
    }

    if (message.action === 'scrapeOne') {
      scrapeChapter(message);
    }

    if (message.action === 'checkSelector') {
      const element = document.querySelector(message.selector);
      return Promise.resolve({ found: !!element });
    }
  });
}
