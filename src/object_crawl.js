/**
 * @author Justin Pauckert (pauckert@bbaw.de)
 * @see http://www.netinstructions.com/how-to-make-a-simple-web-Crawler-in-javascript-and-node-js/
 * this crawler is based on the source code mentioned above and was edited for the purposes of TELOTA
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
                {value: array[index++], done: false} :
                {done: true};
        },
    };
}

const options = {
    headers: {
        'User-Agent': 'request'
    }
};

class Crawler {
    /**
     * @desc Crawler checks if all links and images of a website are online.
     * after created, it can be run by using: my_Crawler.start()
     * To check for broken links, start the Crawler and then check my_Crawler.brokenpages().
     * @param START_URL {string} Our Homepage to start crawling
     * @param MAX_PAGES_TO_CRAWL {number} default = 200
     * @param CRAWL_EXTERNAL_PAGES {boolean} default = false. Will crawl any site that is linked if true.
     * @param CONSOLE_OUTPUT {boolean} prints current visiting url if true
     */
    constructor(START_URL, MAX_PAGES_TO_CRAWL = 200, CRAWL_EXTERNAL_PAGES = false, CONSOLE_OUTPUT = false) {
        this.START_URL = START_URL;
        this.MAX_PAGES_TO_CRAWL = MAX_PAGES_TO_CRAWL;
        this.CRAWL_EXTERNAL_PAGES = CRAWL_EXTERNAL_PAGES;
        this.LOG = CONSOLE_OUTPUT;
        this.numPagesCrawled = 0;
        this.isdone = false;
        this.linkTuples = []; // Stores old (visited), current (visiting) and new link tuples
        this.Iterator = new Iterator(this.linkTuples);
        this.brokenpages = [];
    }

    push(linkTuple) {
        if (!this.linkTuples.some(oldTuple => oldTuple.target === linkTuple.target)) {
            this.linkTuples.push(linkTuple);
        }
    }

    absoluteLink(currentUrl, relative) {
        // converts a relative link to an absolute one
        let stack = currentUrl.split("/"),
            parts = relative.split("/");
        stack.pop(); // remove current file name (or empty string)
        if (parts[0] == '') {parts.shift()}
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === ".")
                continue;
            if (parts[i] === "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        const targetURL = stack.join("/");
        return {origin: currentUrl, target: targetURL};
    }

    validateLink(href, currentUrl) {
        // validates whether or not a link should be excluded from testing it,
        // pushes the url otherwise
        // we don't want to do anything but visit via http or https
        // href = "javascript: ..." should be avoided anyway
        const skipThese = ['afs:', 'cid:', 'file:', 'ftp:', 'mailto:', 'mid:', 'news:', 'x-exec:', '#'];
        let flag = false;
        skipThese.forEach((element) => {
            if (href.startsWith(element)) {
                flag = true;
            }
        });
        if (flag) {}
        else if (href.startsWith('http://') || href.startsWith('https://')) { // absolute links
            if (href.includes(this.initUrl.hostname) || this.CRAWL_EXTERNAL_PAGES) {
                this.push({origin: currentUrl, target: href});
            }
        }
        else { //relative links, files, anchors
            this.push(this.absoluteLink(currentUrl, href));
        }
    }

    collectBaseUrl(base, currentUrl) {
        console.log(base.length);
        if (base.length > 0) {
            const href = base.attr('href');
            if (href) {
                // delete anything after the last slash, we only care about our current dir
                return href.substring(0, href.lastIndexOf('/') + 1)
            } else {
                this.brokenpages.push({origin: currentUrl, target: `base tag badly formatted \n ${base.html()}`});
                return currentUrl
            }
        }
        else {
            return currentUrl
        }
    }

    collectLinks($, currentUrl) {
        const Links = $("a[href]");
        Links.each((index, element) => {
            const href = $(element).attr('href');
            this.validateLink(href, currentUrl);
        });
    }

    collectImages($, currentUrl) {
        const img = $('img');
        img.each((index, element) => {
            let src = $(element).attr('src');
            this.validateLink(src, currentUrl);
        });
    }

    visitPage(linkTuple) {
        if (this.isdone) {} else {
            // Make the request
            request({url: linkTuple.target, headers: {'User-Agent': 'TELOTA webcrawler' }}, (error, response, body) => {
                // very bad requests don't make it through, e.g. http://whathappened-a d///add
                if (typeof (response) === 'undefined') {
                    console.log('The URL \n' + linkTuple.target + '\n is formatted too badly. Its origin is \n' +
                        linkTuple.origin);
                    this.brokenpages.push(linkTuple);
                    this.crawl();
                }
                // Check status code (200 is HTTP OK)
                if (response.statusCode !== 200) {
                    this.brokenpages.push(linkTuple);
                    if (this.LOG) {
                        console.log(chalk.red(`[origin] ${linkTuple.origin}\n`+`[broken link] ${linkTuple.target}`));
                    }
                    this.crawl();
                }
                if (this.LOG) {
                    console.log(chalk.green(`${this.numPagesCrawled}[online] ${linkTuple.target} \n`));
                }
                if (linkTuple.target.includes(this.initUrl.hostname || this.CRAWL_EXTERNAL_PAGES)) {
                    // Parse the document body & collect links
                    const $ = cheerio.load(body);
                    let baseUrl = this.collectBaseUrl($('base'), linkTuple.target + '/'); // we usually lack a slash at the end
                    this.collectLinks($, baseUrl);
                    this.collectImages($, baseUrl);
                    this.numPagesCrawled += 1;
                }
                this.crawl();
            });
        }
    }

    crawl() {
        if (this.linkTuples.length === 0 || this.numPagesCrawled >= this.MAX_PAGES_TO_CRAWL) {
            this.isdone = true;
        }
        else {
            this.visitPage(this.Iterator.next().value);
        }
    }

    start() {
        // reset everything in case the crawler already ran once
        this.numPagesCrawled = 0;
        this.isdone = false;
        this.linkTuples = [];
        this.Iterator = new Iterator(this.linkTuples);
        this.linkTuples.push({origin: 'manual start setup', target: this.START_URL});
        this.initUrl = new URL(this.START_URL); // setup base url to check possible relative links
        this.crawl();
        console.log(this.initUrl.hostname);
    }

    wait(resolve) {
        // Checks every second if the crawler is done.
        // Then resolves the given promise.
        while (this.isdone !== true) {
            setTimeout(() => {
                this.wait(resolve);
            }, 1000);
            return
        }
        // we're done. log the results and resolve
       this.report();
        resolve();
    }

    report(){
        // prints the crawl results (after the crawler is done)
        if (this.LOG) {
            console.log(chalk.blue(
                `Crawling completed.${this.numPagesCrawled} pages crawled. \n` +
                `${this.linkTuples.length - this.numPagesCrawled} pages unchecked because MAX_PAGES_TO_CRAWL was reached before. \n` +
                `${this.brokenpages.length} broken pages found;`)
            );
        }
        for (let tuple of this.brokenpages){
            console.log(chalk.magenta('-----------------------------------------------------'));
            console.log('origin: ' + tuple.origin + '\n');
            console.log('target: ' + tuple.target + '\n');
        }
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
