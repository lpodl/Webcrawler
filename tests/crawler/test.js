/**
 * @author Justin Pauckert (pauckert@bbaw.de)
 * @help run this test via: mocha --no-timeouts
 */
const { expect } = require('chai');
const { Crawler } = require('../../src/object_crawl');

describe('Links are online', () => {
  const MyCrawler = new Crawler('http://correspsearch.net/', 100, false, true);
  before(() => {
    MyCrawler.start();
  });
  it('should not find any broken links', async () => {
    await MyCrawler.promiseToBeDone();
    expect(MyCrawler.brokenpages).to.be.empty;
  });
});

/**

describe('Crawler works fine', () => {
    beforeEach( () => {

        const MyCrawler = new Crawler( // google logo page should be online at all times...
            'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png',
            5, false, false
        )
        MyCrawler.start()
    }
    /** every anchor tag is considered to represent a link
     * as long as its href starts with http:// or https://, we consider it an absolute link
     * if it is not a link, it should be considered a broken one (e.g. '///NOrelLINK')
     * #collectRelativeLinks and #collectabsoluteLinks are not tested for that reason

    describe('#push', () => {
        MyCrawler.push('http://awebsite.com')
        MyCrawler.push('')
    });
 })

}
*
*/