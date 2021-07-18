"use strict";
var assert = require('assert');
var mp4 = require('../src/mp4_util');
describe('Test Moov Class', function () {
    it('test empty path', async () => {
        const fmp4 = new mp4.Mp4Util('');
        assert.ok((await fmp4.isFileComplete()) == false);
        assert.ok((await fmp4.isValidMp4()) == false);
        assert.ok((await fmp4.isProgressiv()) == false);
        assert.ok((await fmp4.genProgressiveMp4('')) == false);
    });
    it('test invalid path', async () => {
        const fmp4 = new mp4.Mp4Util('/invalid-file.mp4');
        assert.ok((await fmp4.isFileComplete()) == false);
        assert.ok((await fmp4.isValidMp4()) == false);
        assert.ok((await fmp4.isProgressiv()) == false);
        assert.ok((await fmp4.genProgressiveMp4('')) == false);
    });
    it('test invalid mp4 file', async () => {
        const fmp4 = new mp4.Mp4Util('./test/data/invalid.mp4');
        assert.ok((await fmp4.isFileComplete()) == false);
        assert.ok((await fmp4.isValidMp4()) == false);
    });

    it('test incomplete and progressive file', async () => {
        const fmp4 = new mp4.Mp4Util('./test/data/incomplete.mp4');
        assert.ok((await fmp4.isFileComplete()) == false);
        assert.ok((await fmp4.isValidMp4()) == true);
        assert.ok((await fmp4.isProgressiv()) == true);
    });
    it('test valid progressiv file', async () => {
        const fmp4 = new mp4.Mp4Util('./test/data/valid_progressive.mp4');
        assert.ok((await fmp4.isFileComplete()) == true);
        assert.ok((await fmp4.isValidMp4()) == true);
        assert.ok((await fmp4.isProgressiv()) == true);
    });
    it('test convert to progressive', async () => {
        const fmp4 = new mp4.Mp4Util('./test/data/valid.mp4');
        assert.ok((await fmp4.isFileComplete()) == true);
        assert.ok((await fmp4.isValidMp4()) == true);
        assert.ok((await fmp4.isProgressiv()) == false);

        assert.ok((await fmp4.genProgressiveMp4('/tmp/t.mp4')) == true);

        const result = new mp4.Mp4Util('/tmp/t.mp4');
        assert.ok((await result.isFileComplete()) == true);
        assert.ok((await result.isValidMp4()) == true);
        assert.ok((await result.isProgressiv()) == true);
        
    });
});
