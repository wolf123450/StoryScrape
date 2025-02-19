The purpose of this package is to scrape data from webpages where stories are available in a single chapter at a time format.  There are better tools for this, such as the calibre plugin FanFicFare, or the same plugin in a standalone format.  But for certain websites, FanFicFare can't work because of cloudFlare bot protection and disabling browser cache.  For this, I have scrapped together this tool.  It's janky, it will have errors, and from time to time may freeze your browser.  But I have been able to get it to work for a 430 page story, with a bit of after the fact editing inside the extension and within calibre.  So be forwarned, if you don't know how epubs are structured and how to edit them in calibre, or don't want to manually verify that the tool actually grabbed every chapter without errors, this tool is not ready for you yet.  Sorry, I made this in one day, maybe if I start getting contributions to my Ko-fi I can justify spending time on it to make it more reliable and easy to use.

What you should already know:
- How css selectors work, and how to find them or grab them in firefox. TODO: add css selector grabber functionality.
- How epub files are structured (zip file with subfolders, everything is basically xhtml).
- How to use calibre to edit/fix epub files.

Expectations for a site in order to be compatible with this tool:
- Each chapter page displays the story title, author, chapter title, chapter body, and a next button/link.
- These elements have selectors that remain consistent from chapter to chapter.
- Chapter titles are unique. TODO: add unique ID to chapters so that this isn't required.

Expected configuration for the "Only Text Content" checkbox is for all to be checked except Chapter Body and Next Button (those need to be unchecked in order to grab images and navigate to next page).  TODO: set defaults and add help text to indicate what should be what and why.

The tool will attempt to download images if present in the chapter body, unless you select the Only Text Content checkbox for the chapter body selector.  Then it will just grab the text. (TODO: this might be broken and you must deselect the only text content checkbox in order for scraping to work).

The tool does not attempt to grab a cover image.  You should add that yourself in calibre if you want one.  TODO: grab cover image.

The tool expects you to start on chapter 1.  Click "Scrape forward" to start scraping each chapter until the next button doesn't work anymore.

Sometimes, especially if there are problems downloading images, a chapter will not save.  This is where manual verification comes in.  Scan through the list of chapters, and you should be able to tell if the index and chapter title number get off from one another.  Assuming the story has numbers in the chapter titles, otherwise you might have to check which number each chapter title thinks it is.  If it's off by more than the normal off by 1 error for 0 indexed lists (vs chapters which generally start at 1), the tool probably missed a chapter (though the author might be doing some weird interlude non-numbered chapter thing, or not include numbers at all).  Figure out which chapter was missed, navigate to it (it's probably easiest to pick the previous chapter in the chapter listing in the extension and click the link, then click the next button on the webpage), then click the "Scrape Chapter" button.  This will just grab the current page, without continuing to automatically click the next button.  Then you must manually enter the index it should be at and click move (It will be moved to that position and refresh the extension), as new chapters are put at the end of scraped chapters by default, meaning that doing this after the fact will require manual reordering.

TODO: Add error detection and don't move on if error or log error and proceed.
TODO: Add validate chapters function?  Would this be any different from just redoing the scraping from the beginning?

Once you have scraped an entire story, and verified that all the chapters are present and images look correct (if a chapter looks broken then clicking "Scrape Chapter" should replace it and its images), then you can click Download EPUB to get a generated EPUB consisting of the chapters and images for the current story.  This must be clicked from a chapter page of the story you want to download with all the selectors (except the next button) present, as that's how the stories chapters are chosen to be downloaded.  TODO: Move download button to the story heading so it doesn't matter what page you try to download from.

It's possible to have multiple stories in the cache at once.  This is not recommended if the stories are large, as the cache has a limited size and having many chapters loaded at once can slow the tool down.  But the chapters should not collide with each other when scraping new chapters or downloading an epub.  I've tested up to ~400 chapters at once, and that can be a bit slow on my really good machine (built circa late 2024).

TODO: Add way to end chapter scraping early, with a fixed number of chapters to scrape or specific link to stop at. (Then you can join chapter batch downloads in calibre if you want).

TODO: Add stop early button.

I have tried to make the epub format consistent and valid, adding bookmarks/Table of Contents and linking images and so on, but frankly I'm not an expert so unforseen problems may arise.  This is why I recommend you know how to edit epubs in calibre, so you can fix any issues that crop up in the file, because this tool isn't going to fix those problems for you, but it should get you 95% of the way there.