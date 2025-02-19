# StoryScrape: Web Novel Chapter Scraper

## Introduction
StoryScrape is a browser extension designed to scrape chapters from web novels where each chapter is available one at a time. While tools like FanFicFare exist, this tool addresses specific issues such as cloudFlare restrictions on certain websites.

**Note:** This tool is still in development and may have bugs or performance issues. It has been tested successfully for a 430-page story with post-editing.

## Features
- Scrapes chapters from web novels.
- Generates EPUB files with bookmarks and Table of Contents.
- Handles multiple stories in the cache (though not recommended for large stories due to memory constraints).

## Requirements
Before using StoryScrape, ensure you have:
1. Basic knowledge of CSS selectors.
2. Familiarity with EPUB structure.
3. Experience with Calibre for potential post-editing.

## Installation
StoryScrape is distributed as a browser extension. To install:

1. Download the extension package from [GitHub Releases](#).
2. Follow your browser's instructions to add the extension.

## Usage

### 1. Configuration
- **CSS Selectors:** Configure selectors for chapter content, title, and next button in `content.js`.
- **Options:** Adjust settings like text encoding and image handling in the popup interface.

### 2. Scraping Chapters
1. Navigate to the first chapter of the novel.
2. Click the extension icon to open the popup.
3. Click "Start Scraping" to begin downloading chapters sequentially.

### 3. Handling Errors
If a chapter fails to download:
- Manually navigate to the chapter.
- Click "Scrape Chapter" in the popup to retry.

### 4. Downloading EPUB
1. Once all chapters are downloaded, click "Download EPUB."
2. The extension will generate an EPUB file with all chapters and images.

## Limitations
- **Cover Images:** Currently unsupported; add manually using Calibre.
- **Cache Size:** Handles up to ~400+ chapters on modern machines but may slow down performance.

## Roadmap

### Features in Development
- **CSS Selector Grabber:** Simplify selector configuration.
- **Stop Button:** Halt scraping at any point.
- **Validate Chapters Function:** Ensure all chapters are correctly downloaded.

### Future Improvements
- **Cover Image Support:** Add cover images directly from the website.
- **EPUB Enhancements:** Improve formatting and metadata handling.

## License
[MIT License](LICENSE)