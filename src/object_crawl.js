/**
 * @author Justin Pauckert (pauckert@bbaw.de)
 * @see http://www.netinstructions.com/how-to-make-a-simple-web-Crawler-in-javascript-and-node-js/
 * Dieser Crawler basiert auf der angegebenen Quelle und wurde für TELOTA angepasst.
 */
const request = require('request');
const cheerio = require('cheerio');
const URL = require('url-parse');
const chalk = require('chalk');

function Iterator(array) {
  let index = 0;
  return {
    next() {
      return index < array.length ?
        { value: array[index++], done: false } :
        { done: true };
    },
  };
}

class Crawler {
  /**
   * @desc Crawler checks if all links and images of a website are online.
   * after created, it can be run by using: my_Crawler.start()
   * To check for broken links, start the Crawler and then check my_Crawler.brokenpages().
   * @param START_URL {string} Our Homepage to start crawling
   * @param MAX_PAGES_TO_VISIT {number} default = 200
   * @param CRAWL_EXTERNAL_PAGES {boolean} default = false. Will crawl any site that is linked.
   * @param CONSOLE_OUTPUT {boolean} prints current visiting url if true
   */
  constructor(START_URL, MAX_PAGES_TO_VISIT = 200, CRAWL_EXTERNAL_PAGES = false, CONSOLE_OUTPUT = false) {
    this.START_URL = START_URL;
    this.MAX_PAGES_TO_VISIT = MAX_PAGES_TO_VISIT;
    this.CRAWL_EXTERNAL_PAGES = CRAWL_EXTERNAL_PAGES;
    this.Links = []; // Stores old (visited), current (visiting) and new links
    this.Iterator = new Iterator(this.Links);
    this.LOG = CONSOLE_OUTPUT;
    this.numPagesVisited = 0;
    this.isdone = false;
  }
  push(url) {
    if (!this.Links.includes(url)) {
      this.Links.push(url);
    }
  }
  collectRelativeLinks($) {
    const relativeLinks = $("a[href^='/']");
    relativeLinks.each((index, element) => {
      this.push(this.baseUrl + $(element).attr('href'));
    });
  }
  collectAbsoluteLinks($) {
    const absoluteLinks = $("a[href^='http']");
    absoluteLinks.each((index, element) => {
      if ($(element).attr('href').includes(this.initUrl.hostname) || this.CRAWL_EXTERNAL_PAGES) {
        this.push($(element).attr('href'));
      }
    });
  }
  collectImages($, currentUrl) {
    const images = $('img');
    images.each((index, element) => {
      if ($(element).attr('src').startsWith('http')) {
        this.push($(element).attr('src'));
      } else if ($(element).attr('src').startsWith('/')) {
        this.push(currentUrl + $(element).attr('src'));
      } else if ($(element).attr('src').startsWith('./')) {
        const ending = $(element).attr('src').substr(1);
        this.push(currentUrl + ending);
      } else if ($(element).attr('src').startsWith('../')) {
        const temp = new URL(currentUrl);
        const ending = $(element).attr('src').substr(2);
        this.push(`${temp.protocol}//${temp.hostname}${ending}`);
      } else { // we expect the image to be at the current path, e.g. src = "image.jpg"
        const temp = new URL(currentUrl);
        this.push(`${temp.protocol}//${temp.hostname}/${$(element).attr('src')}`);
      }
    });
  }
  visitPage(url) {
    this.numPagesVisited += 1;
    // Make the request
    request(url, (error, response, body) => {
      // Check status code (200 is HTTP OK)
      if (response.statusCode !== 200) {
        this.brokenpages.push(url);
        if (this.LOG) {
          console.log(chalk.red(`${url} did not return status code 200`));
        }
        this.crawl(); // crawl on
      } else if (this.LOG) {
        console.log(chalk.green(`${url} is online`));
      }
      // Parse the document body & collect links
      const $ = cheerio.load(body);
      this.collectRelativeLinks($);
      this.collectAbsoluteLinks($);
      this.collectImages($, url);
      this.crawl(); // crawl on
    });
  }
  crawl() {
    if (this.numPagesVisited >= this.MAX_PAGES_TO_VISIT || this.Links.length === 0) {
      if (this.LOG) {
        console.log(`Crawling completed.${this.numPagesVisited} pages visited.${this.Links.length - this.numPagesVisited} pages unchecked because MAX_PAGES_TO_VISIT was reached before. ${this.brokenpages.length} broken pages found; ${this.brokenpages}`);
      }
      this.isdone = true;
      return;
    }
    this.visitPage(this.Iterator.next().value);
  }
  start() {
    // setup base url to check possible relative links
    this.push(this.START_URL);
    this.initUrl = new URL(this.START_URL);
    this.baseUrl = `${this.initUrl.protocol}//${this.initUrl.hostname}`;
    this.brokenpages = [];
    this.crawl();
  }
  wait(resolve) {
    // Checks every second if the crawler is done.
    // Then resolves the given promise.
    while (this.isdone !== true) {
      setTimeout(() => {
        this.wait(resolve);
      }, 1000);
      return;
    }
    resolve();
  }
  promiseToBeDone() {
    // returns a promise that is resolved once the crawler is done.
    return new Promise((resolve) => {
      this.wait(resolve);
    });
  }
}
module.exports = {
  Crawler,
};
