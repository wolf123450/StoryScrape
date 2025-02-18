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
    browser.storage.local.get('chapters').then(result => {
      const chapters = result.chapters || [];
      chapters.push(chapter);
      browser.storage.local.set({chapters: chapters});
    });
    browser.storage.local.get(null).then((items) => {
      console.log(items);
    });
  }

  function createEPUB() {
    console.log("Creating EPUB file...");
    browser.storage.local.get(null).then((items) => {
      console.log(items);
    });
    browser.storage.local.get('chapters').then(result => {
      const chapters = result.chapters || [];
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
              <h1>${chapter.title}</h1>
              <div>${chapter.body}</div>
            </body>
          </html>
        `);
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
            <dc:title>StoryScrape</dc:title>
            <dc:language>en</dc:language>
          </metadata>
          <manifest>
            ${chapters.map((_, index) => `<item id="chapter${index + 1}" href="chapter${index + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("\n")}
          </manifest>
          <spine>
            ${chapters.map((_, index) => `<itemref idref="chapter${index + 1}"/>`).join("\n")}
          </spine>
        </package>
      `);

      // Generate the EPUB file and trigger the download
      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, "story.epub");
      });
    });
  }

  browser.runtime.onMessage.addListener((message) => {
    console.log("Selectors:", message);

    if (message.action === 'downloadEPUB') {
      createEPUB();
      return;
    }

    const chapter = {
      title: logElement(message.chapterTitleSelector, "Chapter Title", message.logChapterTitleText),
      body: logElement(message.chapterBodySelector, "Chapter Body", message.logChapterBodyText)
    };

    if (chapter.title && chapter.body) {
      saveChapter(chapter);
    }

    // Click or follow the link from the next button selector
    if (message.nextButtonSelector) {
      const nextButtonElement = document.querySelector(message.nextButtonSelector);
      if (nextButtonElement) {
        if (nextButtonElement.tagName.toLowerCase() === 'a') {
          window.location.href = nextButtonElement.href;
        } else {
          nextButtonElement.click();
        }
      } else {
        console.log("Next Button Element not found.");
      }
    }
  });
}
