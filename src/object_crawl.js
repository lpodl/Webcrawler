/* eslint-disable no-plusplus */
/**
 * @author Justin Pauckert (pauckert@bbaw.de)
 * @see http://www.netinstructions.com/how-to-make-a-simple-web-Crawler-in-javascript-and-node-js/
 * this crawler is based on the source code mentioned above
 * and was edited for the purposes of TELOTA
 */
const request = require('request');
const cheerio = require('cheerio');
const URL = require('url-parse');
const chalk = require('chalk');
const fs = require('fs');
const dateFormat = require('dateformat');

function Iterator(array) {
  let index = 0;
  return {
    next() {
      return index < array.length
        ? {
            value: array[index++],
            done: false
          }
        : {
            done: true
          };
    },
    current() {
      return index;
    }
  };
}

function absoluteLink(currentUrl, relative) {
  // converts a relative link to an absolute one
  let stack = currentUrl.split('/');
  const parts = relative.split('/');
  stack.pop(); // remove current file name (or empty string)
  if (parts[0] === '') {
    stack = stack.slice(0, 3);
    parts.shift();
  }
  for (let i = 0; i < parts.length; i += 1) {
    // eslint-disable-next-line no-continue
    if (parts[i] === '.') continue;
    if (parts[i] === '..') stack.pop();
    else stack.push(parts[i]);
  }
  const targetURL = stack.join('/');
  return targetURL;
}

function reduceTuple(tuple) {
  // takes a tuple of the form {origin:..., target:..., element:...}
  // deletes origin and element to reduce heap size
  return { target: tuple.target };
}
class Crawler {
  /**
   * @desc Crawler checks if all links and images of a website are online.
   * after created, it can be run by using: my_Crawler.start()
   * To check for broken links, start the Crawler and then check my_Crawler.brokenpages().
   * @param START_URL {string} Our Homepage to start crawling
   * @param MAX_PAGES_TO_CRAWL {number} default = 200
   * @param CRAWL_EXTERNAL_PAGES {boolean} default = false. Will crawl any site if set to true.
   * @param CONSOLE_OUTPUT {boolean} prints current visiting url if true
   */
  constructor(
    START_URL,
    MAX_PAGES_TO_CRAWL = 200,
    CRAWL_EXTERNAL_PAGES = false,
    CONSOLE_OUTPUT = false
  ) {
    this.START_URL = START_URL;
    this.MAX_PAGES_TO_CRAWL = MAX_PAGES_TO_CRAWL;
    this.CRAWL_EXTERNAL_PAGES = CRAWL_EXTERNAL_PAGES;
    this.verbose = CONSOLE_OUTPUT;
    this.numPagesCrawled = 0;
    this.isdone = false;
    this.linkTuples = []; // Stores old (visited), current (visiting) and new link tuples
    this.Iterator = new Iterator(this.linkTuples);
    this.brokenpages = [];
  }

  log(str, color) {
    if (this.verbose) {
      if (color === 'green') {
        console.log(chalk.green(str));
      } else if (color === 'red') {
        console.log(chalk.red(str));
      } else if (color === 'yellow') {
        console.log(chalk.yellow(str));
      } else {
        console.log(str);
      }
    }
  }

  pushNew(linkTuple) {
    // add broken target URLs to queue even if we've alrdy checked them
    // we'll collect multiple broken links to the same missing address this way
    if (this.brokenpages.some(brokenTuple => brokenTuple.target === linkTuple.target)){
      this.linkTuples.push(linkTuple);
    }
    // only add target URL to queue if we haven't visited it yet
    if (!this.linkTuples.some(oldTuple => oldTuple.target === linkTuple.target)) {
      this.linkTuples.push(linkTuple);
    }
  }

  validateLink(currentUrl, href, attributes) {
    // validates whether or not a link should be excluded from testing it,
    // pushes the url otherwise
    const SkipStart = ['afs:', 'cid:', 'file:', 'ftp:', 'mailto:', 'mid:', 'news:', 'x-exec:', '#'];
    const SkipEnd = ['.mp3', '.mp4', '.webm', '.wav', '.flac', '.ogg', '.pdf'];
    const flagStart = skipPhrase => href.startsWith(skipPhrase);
    const flagEnd = skipPhrase => href.endsWith(skipPhrase);
    if (typeof href === 'undefined') {
      this.brokenpages.push({
        origin: currentUrl,
        target: href,
        attributes
      });
    } else if (SkipStart.some(flagStart) || SkipEnd.some(flagEnd)) {
      // skip href
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
      if (href.includes(this.initUrl.hostname) || this.CRAWL_EXTERNAL_PAGES) {
        // push absolute links
        this.pushNew({
          origin: currentUrl,
          target: href,
          attributes
        });
      }
    } else {
      // relative links, files, anchors
      this.pushNew({
        origin: currentUrl,
        target: absoluteLink(currentUrl, href),
        attributes
      });
    }
  }

  collectBaseUrl(base, currentUrl) {
    if (base.length === 1) {
      const href = base.attr('href');
      if (href === 'undefined') {
        this.brokenpages.push({
          origin: currentUrl,
          target: 'undefined',
          element: 'base'
        });
        return currentUrl;
      }
      // delete anything after the last slash, we just need the path
      return href.substring(0, href.lastIndexOf('/') + 1);
    }
    if (base.length > 2) {
      this.brokenpages.push({
        origin: currentUrl,
        target: 'more than one base tag specified',
      });
      return currentUrl;
    }
    return currentUrl;
  }

  collectLinks($, currentUrl) {
    const Links = $('a[href]');
    Links.each((index, element) => {
      const href = $(element).attr('href');
      const attributes = JSON.stringify(element.attribs);
      this.validateLink(currentUrl, href, attributes);
    });
  }

  collectImages($, currentUrl) {
    const img = $('img');
    img.each((index, element) => {
      const src = $(element).attr('src');
      const attributes = JSON.stringify(element.attribs);
      this.validateLink(currentUrl, src, attributes);
    });
  }

  visitPage(linkTuple) {
    // Make the request
    request(
      {
        url: linkTuple.target,
        headers: {
          'User-Agent': 'TELOTA webcrawler'
        }
      },
      (error, response, body) => {
        // prettier-ignore
        if (typeof response === 'undefined') {
          this.log(`The URL \n${linkTuple.target}\n is formatted too badly. Its origin is \n${linkTuple.origin}`, 'red');
          this.brokenpages.push(linkTuple);
          this.crawl();
        } else if (response.statusCode !== 200) {
        // push broken page if status code is not 200 HTTP OK
          this.brokenpages.push(linkTuple);
          this.log(`[origin] ${linkTuple.origin}\n[broken link] ${linkTuple.target}`, 'red');
          this.crawl();
        } else {
          this.log(`${this.numPagesCrawled}[online] ${linkTuple.target} \n`, 'green');
          if (linkTuple.target.includes(this.initUrl.hostname || this.CRAWL_EXTERNAL_PAGES)) {
            // Parse the document body & collect links
            const $ = cheerio.load(body);
            const baseUrl = this.collectBaseUrl($('base'), `${linkTuple.target}/`); // we usually lack a slash at the end
            this.collectLinks($, baseUrl);
            this.collectImages($, baseUrl);
            this.numPagesCrawled += 1;
            this.crawl();
          }
        }
      }
    );
  }

  crawl() {
    // visit next page if there is one and maximum page count is not exceeded
    const nextPage = this.Iterator.next().value;
    if (typeof nextPage === 'undefined' || this.numPagesCrawled >= this.MAX_PAGES_TO_CRAWL) {
      this.log('Crawling done. Resolve and log...', 'yellow');
      this.isdone = true;
    } else {
      this.visitPage(nextPage);
    }
  }

  start() {
    // reset everything in case the crawler already ran once
    this.numPagesCrawled = 0;
    this.isdone = false;
    this.linkTuples = [];
    this.Iterator = new Iterator(this.linkTuples);
    this.linkTuples.push({
      origin: 'manual start setup',
      target: this.START_URL
    });
    this.initUrl = new URL(this.START_URL); // setup base url to check possible relative links
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
    // we're done. log the results and resolve
    this.report();
    resolve();
  }

  report() {
    // logs the results to a file after the crawler is done
    const date = new Date();
    let report = `WebCrawler Report from ${date.toString()} \n`;
    // prettier-ignore
    report = report.concat(
      `Crawling completed.${this.numPagesCrawled} pages crawled. \r\n`+ 
      `${this.linkTuples.length - this.numPagesCrawled} pages unchecked because MAX_PAGES_TO_CRAWL was reached before. \r\n` +
      `${this.brokenpages.length} broken pages found. \r\n`,
    );
    // create an object with origins as properties
    // each origin property contains the broken targets found on that page
    let record = {};
    this.brokenpages.forEach((tuple) => {
      const origin = tuple.origin;
      record[origin] = (record[origin] || []).concat({'target':tuple.target, 'attributes': tuple.attributes});
    })
    // Create a headline for each origin
    Object.keys(record).forEach((originKey) => {
      report = report.concat(
        '---------------------------------------------------------\r\n ' +
        originKey +
        '\r\n ---------------------------------------------------------\r\n '
      )
      // fill in all broken pages found on that site
      record[originKey].forEach((brokenTuple) => {
        report = report.concat(
          `target: ${brokenTuple.target}\r\n` +
          `attributes: ${brokenTuple.attributes}\r\n \r\n`,
        )
      })
    })
    fs.writeFile(`../../log/${dateFormat(date, 'mm-dd-yyyy HH-MM')}.txt`, report);
  }

  promiseToBeDone() {
    // returns a promise that is resolved once the crawler is done.
    return new Promise(resolve => {
      this.wait(resolve);
    });
  }
}

module.exports = {
  Crawler
};


/*const MyCrawler = new Crawler(
    // 'http://www.bbaw.de/', // start URL
    'http://www.bbaw.de/en/telota/resources/',
    100, // max pages to crawl
    false, // crawl external pages
    true, // verbose console output
  );
MyCrawler.start();
*/