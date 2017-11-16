"use strict";
exports.__esModule = true;
var util_1 = require("../util/util");
// Note: UTF16-LE (or UCS2) codec is Node.js native. See encodings/internal.js
// == UTF16-BE codec. ==========================================================
var Utf16BECodec = /** @class */ (function () {
    function Utf16BECodec() {
        this.encoder = Utf16BEEncoder;
        this.decoder = Utf16BEDecoder;
        this.bomAware = true;
    }
    return Utf16BECodec;
}());
// -- Encoding
var Utf16BEEncoder = /** @class */ (function () {
    function Utf16BEEncoder() {
    }
    Utf16BEEncoder.prototype.write = function (str) {
        var buf = util_1.strToBuf(str);
        var bufView = new Uint8Array(buf);
        for (var i = 0; i < buf.byteLength; i += 2) {
            var tmp = bufView[i];
            bufView[i] = bufView[i + 1];
            bufView[i + 1] = tmp;
        }
        return buf;
    };
    Utf16BEEncoder.prototype.end = function () {
    };
    return Utf16BEEncoder;
}());
// -- Decoding
var Utf16BEDecoder = /** @class */ (function () {
    function Utf16BEDecoder() {
        this.overflowByte = -1;
    }
    Utf16BEDecoder.prototype.write = function (buf) {
        var bufView = new Uint8Array(buf);
        if (buf.byteLength == 0)
            return '';
        var buf2 = new ArrayBuffer(buf.byteLength + 1), buf2View = new Uint8Array(buf2), i = 0, j = 0;
        if (this.overflowByte !== -1) {
            buf2View[0] = bufView[0];
            buf2View[1] = this.overflowByte;
            i = 1;
            j = 2;
        }
        for (; i < buf.byteLength - 1; i += 2, j += 2) {
            buf2View[j] = bufView[i + 1];
            buf2View[j + 1] = bufView[i];
        }
        this.overflowByte = (i == buf.byteLength - 1) ? bufView[buf.byteLength - 1] : -1;
        return util_1.bufToStr(buf2.slice(0, j));
    };
    Utf16BEDecoder.prototype.end = function () {
    };
    return Utf16BEDecoder;
}());
// == UTF-16 codec =============================================================
// Decoder chooses automatically from UTF-16LE and UTF-16BE using BOM and space-based heuristic.
// Defaults to UTF-16LE, as it's prevalent and default in Node.
// http://en.wikipedia.org/wiki/UTF-16 and http://encoding.spec.whatwg.org/#utf-16le
// Decoder default can be changed: iconv.decode(buf, 'utf16', {defaultEncoding: 'utf-16be'});
// Encoder uses UTF-16LE and prepends BOM (which can be overridden with addBOM: false).
var Utf16Codec = /** @class */ (function () {
    function Utf16Codec(codecOptions, iconv) {
        this.encoder = Utf16Encoder;
        this.decoder = Utf16Decoder;
        this.iconv = iconv;
    }
    return Utf16Codec;
}());
// -- Encoding (pass-through)
var Utf16Encoder = /** @class */ (function () {
    function Utf16Encoder(options, codec) {
        options = options || {};
        if (options.addBOM === undefined)
            options.addBOM = true;
        this.encoder = codec.iconv.getEncoder('utf-16le', options);
    }
    Utf16Encoder.prototype.write = function (str) {
        return this.encoder.write(str);
    };
    Utf16Encoder.prototype.end = function () {
        return this.encoder.end();
    };
    return Utf16Encoder;
}());
// -- Decoding
var Utf16Decoder = /** @class */ (function () {
    function Utf16Decoder(options, codec) {
        this.initialBytesLen = 0;
        this.decoder = null;
        this.initialBytes = [];
        this.initialBytesLen = 0;
        this.options = options || {};
        this.iconv = codec.iconv;
    }
    Utf16Decoder.prototype.write = function (buf) {
        if (!this.decoder) {
            // Codec is not chosen yet. Accumulate initial bytes.
            this.initialBytes.push(buf);
            this.initialBytesLen += buf.byteLength;
            if (this.initialBytesLen < 16)
                return '';
            // We have enough bytes -> detect endianness.
            buf = util_1.concatBuf(this.initialBytes);
            var encoding = util_1.detectEncoding(buf, this.options.defaultEncoding);
            this.decoder = this.iconv.getDecoder(encoding, this.options);
            this.initialBytes.length = this.initialBytesLen = 0;
        }
        return this.decoder.write(buf);
    };
    Utf16Decoder.prototype.end = function () {
        if (!this.decoder) {
            var buf = util_1.concatBuf(this.initialBytes), encoding = util_1.detectEncoding(buf, this.options.defaultEncoding);
            this.decoder = this.iconv.getDecoder(encoding, this.options);
            var res = this.decoder.write(buf), trail = this.decoder.end();
            return trail ? (res + trail) : res;
        }
        return this.decoder.end();
    };
    return Utf16Decoder;
}());
exports.utf16be = Utf16BECodec;
exports.utf16 = Utf16Codec;
