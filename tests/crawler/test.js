/**
 * @author Justin Pauckert (pauckert@bbaw.de)
 * @help run this test via: mocha --no-timeouts
 */
const { expect } = require('chai');
const { Crawler } = require('../../src/object_crawl');

describe('HTTP 200', () => {
  const MyCrawler = new Crawler('http://correspsearch.net', 200, false, true);
  before(() => {
    MyCrawler.start();
  });
  it('should not find any broken links', async () => {
    await MyCrawler.promiseToBeDone();
    expect(MyCrawler.brokenpages).to.be.empty;
  });
});
