# WebCrawler

## What it does

Starting from a given url, the Crawler will:

1. Scrape the current website for links (including images)
2. Add all new links to its queue (excluding anything but http and https)
3. Visit the next site in queue
4. Continue with step 1 until there are no pages left to visit or a maximum view count is exceeded

This repository includes a setup to test for broken links on a website with Mocha.js.



## Setup

Download this repository and run  ` npm install .` or `yarn`. This will fetch and install all needed libraries for this crawler.

Go to tests\crawler and open `test.js`. A new Webcrawler is initiated. Enter your specifications for it:
```javascript
const MyCrawler = new Crawler(
      'http://www.bbaw.de/', // start URL - keep in mind that you'll have to be specific with slashes!
      1000, // max pages to crawl - (external) pages, which are just visited and not crawled do not count
      false, // crawl external pages - will ONLY check if external links are online, not crawl them if set to false (recommended)
      true  // verbose console output
  );
```
Save the file, stay in this directory and run  
`mocha --no-timeouts`
to start the Crawler.

Note that our colored output might look different or not colored at all if you're using a custom color scheme for your console.
 
 
 
## How it works


Since crawling Webpages is pretty straight forward I won't explain the very basics of it and refer to the 
[original blueprint](http://www.netinstructions.com/how-to-make-a-simple-web-Crawler-in-javascript-and-node-js/) of my crawler instead. Let's go through the differences step by step:

#### Searching for broken Links

The initial Crawler was more a proof of concept and crawled until a given word was found. We want to find broken links and have a clear ouput even for a large number of pages to crawl.
Searching for a word is not implemented anymore, console outputs are far more verbose and structured.

#### OOP all the way

For a variety of reasons, using objects that crawl "on their own" is convenient. We can save broken links as properties, we don't have to pass parameters like the current page count
and have multiple crawlers with different ouput verbosity. Crawlers are initialized as shown above and executed via MyCrawlert.start().

#### Running a test with mocha

The main purpose of writing this crawler was to run a "check for broken links" test alongside our other tests for a website. [Mocha.js](https://mochajs.org/) is an excellend JavaScript test framework.
Usually, you'll write mocha tests using an assertion library like chai.js and mocha will expect certain assertions to be true. While this works perfectly well for testing for 
a missing header on a website, mocha will raise a timeout error if your tests take too long.
Fortunately, mocha supports asynchronous testing with promises (see [here](https://mochajs.org/#working-with-promises)) and a `--no-timeouts` option.
What `test.js` does: 
* initialize a new crawler MyCrawler with our specifications
* run MyCrawler.start()
* wait for its promise (MyCrawler.PromiseToBeDone) to resolve
* check if MyCrawler.brokenpages is empty or not

#### Objects instead of strings

Usually, we already know which ressource is offline. We just want to update the old links and be done. This is where objects come into play.
Links are stored in Objects with four properties:
* origin - URL where we found the broken link
* target - URL of the link that is broken
* text - from within the anchor element
* attributes - object containing the attributes of the anchor / img (most importantly href / src)

#### Log files

Using our objects it is possible to summarize the test in a log file. Broken links from the same origin are grouped together and listed together with all the available data on them. Log files are automatically saved to `\log` and named by the time of the test.

## Possible Modifications

#### Searching for a Keyword

Let's say your Adress changed and you wanted to find all subpages on your domain that you did not update yet. You could use cheerio to parse the body and search for your old adress.
```javascript
function searchForWord($, word) {
  let bodyText = $('html > body').text();
  if(bodyText.toLowerCase().indexOf(word.toLowerCase()) !== -1) {
    return true
  }
  return false;
}
```
Create a property called `oldAdressPages` for our crawler.  
Edit the visitPage function to store all URLS with the old adress in this.oldAdressPages:
```javascript
visitPage {
...
if (linkTuple.target.includes(this.initUrl.hostname || this.CRAWL_EXTERNAL_PAGES)) {
	const $ = cheerio.load(body);
        if (this.searchForWord('Old Street 45')) {
	this.oldAdressPages.push(linkTuple.target);
	}
...
```

#### Excluding references that are not state of the art

Allthough some Links are not leading into a 404, they may work in a way that is not good practice. Links with ```href="javascript:;"``` are considered broken links and there's a 
[better way](https://stackoverflow.com/a/8493975/7395578) to do this. The same argument holds for ```href="/../subpage"```. If you don't want to change these old references and don't want
the test to fail because of them, add your exceptions to ```SkipStart```, ```SkipAnywhere``` or ```SkipEnd``` in the validateLink function.
This currently includes file endings as well, because loading the body of a PDF ressource is not going to work. You may add a specific `visitFileURL`function that only checks for the HTTP Code and continues to crawl afterwards.