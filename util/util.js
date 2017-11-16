"use strict";
exports.__esModule = true;
function concatBuf(bufs) {
    var len, bufViews = [], newBuf, index = -1, newBufView;
    for (var _i = 0, bufs_1 = bufs; _i < bufs_1.length; _i++) {
        var buf = bufs_1[_i];
        len += buf.byteLength;
        bufViews.push(new Uint8Array(buf));
    }
    newBuf = new ArrayBuffer(len);
    newBufView = new Uint8Array(newBuf);
    for (var _a = 0, bufViews_1 = bufViews; _a < bufViews_1.length; _a++) {
        var bufView = bufViews_1[_a];
        bufView.forEach(function (value) { return newBufView[++index]; });
    }
    return newBuf;
}
exports.concatBuf = concatBuf;
function bufToStr(buf, type) {
    var bufView = new Uint16Array(buf);
    var str = '';
    bufView.forEach(function (value) { return str += String.fromCharCode(value); });
    return str;
}
exports.bufToStr = bufToStr;
function strToBuf(str, type) {
    var newBuf = new ArrayBuffer(str.length * 2);
    var newBufView = new Uint16Array(newBuf);
    for (var i = 0, len = str.length; i < len; i++) {
        newBufView[i] = str.charCodeAt(i);
    }
    return newBuf;
}
exports.strToBuf = strToBuf;
function findIdx(table, val) {
    if (table[0] > val)
        return -1;
    var l = 0, r = table.length;
    while (l < r - 1) {
        var mid = l + Math.floor((r - l + 1) / 2);
        if (table[mid] <= val)
            l = mid;
        else
            r = mid;
    }
    return l;
}
exports.findIdx = findIdx;
function detectEncoding(buf, defaultEncoding) {
    var enc = defaultEncoding || 'utf-16le';
    if (buf.length >= 2) {
        if (buf[0] == 0xFE && buf[1] == 0xFF)
            enc = 'utf-16be';
        else if (buf[0] == 0xFF && buf[1] == 0xFE)
            enc = 'utf-16le';
        else {
            var asciiCharsLE = 0, asciiCharsBE = 0, _len = Math.min(buf.length - (buf.length % 2), 64);
            for (var i = 0; i < _len; i += 2) {
                if (buf[i] === 0 && buf[i + 1] !== 0)
                    asciiCharsBE++;
                if (buf[i] !== 0 && buf[i + 1] === 0)
                    asciiCharsLE++;
            }
            if (asciiCharsBE > asciiCharsLE)
                enc = 'utf-16be';
            else if (asciiCharsBE < asciiCharsLE)
                enc = 'utf-16le';
        }
    }
    return enc;
}
exports.detectEncoding = detectEncoding;
function writeBuf(buf, content, startIndex, endInex) {
    return 0;
}
exports.writeBuf = writeBuf;
//# sourceMappingURL=util.js.map