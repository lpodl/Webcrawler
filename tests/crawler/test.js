/**
 * @author Justin Pauckert (pauckert@bbaw.de)
 * @help run this test via: mocha --no-timeouts
 */
/* eslint-disable */
const {
  expect
} = require('chai');
const {
  Crawler
} = require('../../src/object_crawl');

describe('Links are online', () => {
  const MyCrawler = new Crawler(
    'http://www.bbaw.de/', //start URL
    1500, // max pages to crawl
    false, // crawl external pages
    true, // verbose console output
  );
  before(() => {
    MyCrawler.start();
  });
  it('should not find any broken links', async () => {
    await MyCrawler.promiseToBeDone();
    expect(MyCrawler.brokenpages).to.be.empty;
  });
});