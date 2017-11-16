"use strict";
exports.__esModule = true;
var util_1 = require("../util/util");
var nonDirectChars = /[^A-Za-z0-9'\(\),-\.\/:\? \n\r\t]+/g;
var Utf7Codec = (function () {
    function Utf7Codec(codecOptions, iconv) {
        this.encoder = Utf7Encoder;
        this.decoder = Utf7Decoder;
        this.bomAware = true;
        this.iconv = iconv;
    }
    return Utf7Codec;
}());
var Utf7Encoder = (function () {
    function Utf7Encoder(options, codec) {
        this.iconv = codec.iconv;
    }
    Utf7Encoder.prototype.write = function (str) {
        return util_1.strToBuf(str.replace(nonDirectChars, function (chunk) {
            return "+" + (chunk === '+' ? '' :
                this.iconv.encode(chunk, 'utf16-be').toString('base64').replace(/=+$/, ''))
                + "-";
        }.bind(this)));
    };
    Utf7Encoder.prototype.end = function () {
    };
    return Utf7Encoder;
}());
var base64Regex = /[A-Za-z0-9\/+]/;
var base64Chars = [];
for (var i = 0; i < 256; i++)
    base64Chars[i] = base64Regex.test(String.fromCharCode(i));
var plusChar = '+'.charCodeAt(0), minusChar = '-'.charCodeAt(0), andChar = '&'.charCodeAt(0);
var Utf7Decoder = (function () {
    function Utf7Decoder(options, codec) {
        this.iconv = codec.iconv;
        this.inBase64 = false;
        this.base64Accum = '';
    }
    Utf7Decoder.prototype.write = function (buf) {
        var res = "", lastI = 0, inBase64 = this.inBase64, bufView = new Uint8Array(buf), base64Accum = this.base64Accum;
        for (var i = 0; i < buf.byteLength; i++) {
            if (!inBase64) {
                if (bufView[i] == plusChar) {
                    res += this.iconv.decode(buf.slice(lastI, i), "ascii");
                    lastI = i + 1;
                    inBase64 = true;
                }
            }
            else {
                if (!base64Chars[bufView[i]]) {
                    if (i == lastI && bufView[i] == minusChar) {
                        res += "+";
                    }
                    else {
                        var b64str = base64Accum + buf.slice(lastI, i).toString();
                        res += this.iconv.decode(util_1.strToBuf(b64str, 'base64'), "utf16-be");
                    }
                    if (bufView[i] != minusChar)
                        i--;
                    lastI = i + 1;
                    inBase64 = false;
                    base64Accum = '';
                }
            }
        }
        if (!inBase64) {
            res += this.iconv.decode(buf.slice(lastI), "ascii");
        }
        else {
            var b64str = base64Accum + buf.slice(lastI).toString();
            var canBeDecoded = b64str.length - (b64str.length % 8);
            base64Accum = b64str.slice(canBeDecoded);
            b64str = b64str.slice(0, canBeDecoded);
            res += this.iconv.decode(util_1.strToBuf(b64str, 'base64'), "utf16-be");
        }
        this.inBase64 = inBase64;
        this.base64Accum = base64Accum;
        return res;
    };
    Utf7Decoder.prototype.end = function () {
        var res = "";
        if (this.inBase64 && this.base64Accum.length > 0)
            res = this.iconv.decode(util_1.strToBuf(this.base64Accum, 'base64'), "utf16-be");
        this.inBase64 = false;
        this.base64Accum = '';
        return res;
    };
    return Utf7Decoder;
}());
var Utf7IMAPCodec = (function () {
    function Utf7IMAPCodec(codecOptions, iconv) {
        this.encoder = Utf7IMAPEncoder;
        this.decoder = Utf7IMAPDecoder;
        this.bomAware = true;
        this.iconv = iconv;
    }
    return Utf7IMAPCodec;
}());
var Utf7IMAPEncoder = (function () {
    function Utf7IMAPEncoder(options, codec) {
        this.iconv = codec.iconv;
        this.inBase64 = false;
        this.base64Accum = new ArrayBuffer(6);
        this.base64AccumV = new Uint8Array(this.base64Accum);
        this.base64AccumIdx = 0;
    }
    Utf7IMAPEncoder.prototype.write = function (str) {
        var inBase64 = this.inBase64, base64Accum = this.base64Accum, base64AccumV = this.base64AccumV, base64AccumIdx = this.base64AccumIdx, buf = new ArrayBuffer(str.length * 5 + 10), bufIdx = 0, bufView = new Uint8Array(buf);
        for (var i = 0; i < str.length; i++) {
            var uChar = str.charCodeAt(i);
            if (0x20 <= uChar && uChar <= 0x7E) {
                if (inBase64) {
                    if (base64AccumIdx > 0) {
                        bufIdx += util_1.writeBuf(buf, util_1.bufToStr(base64Accum.slice(0, base64AccumIdx), 'base64').replace(/\//g, ',').replace(/=+$/, ''), bufIdx);
                        base64AccumIdx = 0;
                    }
                    bufView[bufIdx++] = minusChar;
                    inBase64 = false;
                }
                if (!inBase64) {
                    bufView[bufIdx++] = uChar;
                    if (uChar === andChar)
                        bufView[bufIdx++] = minusChar;
                }
            }
            else {
                if (!inBase64) {
                    bufView[bufIdx++] = andChar;
                    inBase64 = true;
                }
                if (inBase64) {
                    base64Accum[base64AccumIdx++] = uChar >> 8;
                    base64Accum[base64AccumIdx++] = uChar & 0xFF;
                    if (base64AccumIdx == base64Accum.byteLength) {
                        bufIdx += util_1.writeBuf(buf, util_1.bufToStr(base64Accum, 'base64').replace(/\//g, ','), bufIdx);
                        base64AccumIdx = 0;
                    }
                }
            }
        }
        this.inBase64 = inBase64;
        this.base64AccumIdx = base64AccumIdx;
        return buf.slice(0, bufIdx);
    };
    Utf7IMAPEncoder.prototype.end = function () {
        var buf = new ArrayBuffer(10), bufIdx = 0;
        var bufView = new Uint8Array(buf);
        if (this.inBase64) {
            if (this.base64AccumIdx > 0) {
                bufIdx += util_1.writeBuf(buf, util_1.bufToStr(this.base64Accum.slice(0, this.base64AccumIdx), 'base64')
                    .replace(/\//g, ',')
                    .replace(/=+$/, ''), bufIdx);
                this.base64AccumIdx = 0;
            }
            bufView[bufIdx++] = minusChar;
            this.inBase64 = false;
        }
        return buf.slice(0, bufIdx);
    };
    return Utf7IMAPEncoder;
}());
var base64IMAPChars = base64Chars.slice();
base64IMAPChars[','.charCodeAt(0)] = true;
var Utf7IMAPDecoder = (function () {
    function Utf7IMAPDecoder(options, codec) {
        this.iconv = codec.iconv;
        this.inBase64 = false;
        this.base64Accum = '';
    }
    Utf7IMAPDecoder.prototype.write = function (buf) {
        var bufView = new Uint8Array(buf), res = "", lastI = 0, inBase64 = this.inBase64, base64Accum = this.base64Accum;
        for (var i = 0; i < buf.byteLength; i++) {
            if (!inBase64) {
                if (bufView[i] == andChar) {
                    res += this.iconv.decode(buf.slice(lastI, i), "ascii");
                    lastI = i + 1;
                    inBase64 = true;
                }
            }
            else {
                if (!base64IMAPChars[bufView[i]]) {
                    if (i == lastI && bufView[i] == minusChar) {
                        res += "&";
                    }
                    else {
                        var b64str = base64Accum + util_1.bufToStr(buf.slice(lastI, i)).replace(/,/g, '/');
                        res += this.iconv.decode(util_1.strToBuf(b64str, 'base64'), "utf16-be");
                    }
                    if (bufView[i] != minusChar)
                        i--;
                    lastI = i + 1;
                    inBase64 = false;
                    base64Accum = '';
                }
            }
        }
        if (!inBase64) {
            res += this.iconv.decode(buf.slice(lastI), "ascii");
        }
        else {
            var b64str = base64Accum + util_1.bufToStr(buf.slice(lastI)).replace(/,/g, '/');
            var canBeDecoded = b64str.length - (b64str.length % 8);
            base64Accum = b64str.slice(canBeDecoded);
            b64str = b64str.slice(0, canBeDecoded);
            res += this.iconv.decode(util_1.strToBuf(b64str, 'base64'), "utf16-be");
        }
        this.inBase64 = inBase64;
        this.base64Accum = base64Accum;
        return res;
    };
    Utf7IMAPDecoder.prototype.end = function () {
        var res = "";
        if (this.inBase64 && this.base64Accum.length > 0)
            res = this.iconv.decode(util_1.strToBuf(this.base64Accum, 'base64'), "utf16-be");
        this.inBase64 = false;
        this.base64Accum = '';
        return res;
    };
    return Utf7IMAPDecoder;
}());
exports.utf7 = Utf7Codec;
exports.unicode11utf7 = 'utf7';
exports.utf7imap = Utf7IMAPCodec;
//# sourceMappingURL=utf7.js.map