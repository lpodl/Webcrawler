/**
 * @author Justin Pauckert (pauckert@bbaw.de)
 * @help run this test via: mocha --no-timeouts
 */
const { expect } = require('chai');
const { Crawler } = require('../../src/object_crawl');

describe('Links are online', () => {
  const MyCrawler = new Crawler('http://www.bbaw.de/', 1000, false, true);
  before(() => {
    MyCrawler.start();
  });
  it('should not find any broken links', async () => {
    await MyCrawler.promiseToBeDone();
    expect(MyCrawler.brokenpages).to.be.empty;
    console.table(MyCrawler.brokenpages);
  });
});
