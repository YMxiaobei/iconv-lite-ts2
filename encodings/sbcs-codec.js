"use strict";
exports.__esModule = true;
var util_1 = require("../util/util");
var SBCSCodec = (function () {
    function SBCSCodec(codecOptions, iconv) {
        this.encoder = SBCSEncoder;
        this.decoder = SBCSDecoder;
        if (!codecOptions)
            throw new Error("SBCS codec is called without the data.");
        if (!codecOptions.chars || (codecOptions.chars.length !== 128 && codecOptions.chars.length !== 256))
            throw new Error("Encoding '" + codecOptions.type + "' has incorrect 'chars' (must be of len 128 or 256)");
        if (codecOptions.chars.length === 128) {
            var asciiString = "";
            for (var i = 0; i < 128; i++)
                asciiString += String.fromCharCode(i);
            codecOptions.chars = asciiString + codecOptions.chars;
        }
        this.decodeBuf = new ArrayBuffer(codecOptions.chars);
        var encodeBuf = new ArrayBuffer(65536);
        var encodeBufView = new Uint8Array(encodeBuf);
        for (var i = 0; i < 65536; i++) {
            encodeBufView[i] = iconv.defaultCharSingleByte.charCodeAt(0);
        }
        for (var i = 0; i < codecOptions.chars.length; i++)
            encodeBufView[codecOptions.chars.charCodeAt(i)] = i;
        this.encodeBuf = encodeBuf;
    }
    return SBCSCodec;
}());
var SBCSEncoder = (function () {
    function SBCSEncoder(options, codec) {
        this.encodeBuf = codec.encodeBuf;
        this.encodeBufView = new Uint8Array(this.encodeBuf);
    }
    SBCSEncoder.prototype.write = function (str) {
        var buf = new ArrayBuffer(str.length);
        var bufView = new Uint8Array(buf);
        for (var i = 0; i < str.length; i++)
            bufView[i] = this.encodeBufView[str.charCodeAt(i)];
        return buf;
    };
    SBCSEncoder.prototype.end = function () {
    };
    return SBCSEncoder;
}());
var SBCSDecoder = (function () {
    function SBCSDecoder(options, codec) {
        this.decodeBuf = codec.decodeBuf;
        this.decodeBufView = new Uint8Array(this.decodeBuf);
    }
    SBCSDecoder.prototype.write = function (buf) {
        var bufView = new Uint8Array(buf);
        var decodeBuf = this.decodeBuf;
        var decodeBufView = new Uint8Array(decodeBuf);
        var newBuf = new ArrayBuffer(buf.byteLength * 2);
        var newBufView = new Uint8Array(newBuf);
        var idx1 = 0, idx2 = 0;
        for (var i = 0; i < buf.byteLength; i++) {
            idx1 = bufView[i] * 2;
            idx2 = i * 2;
            newBufView[idx2] = decodeBufView[idx1];
            newBuf[idx2 + 1] = decodeBufView[idx1 + 1];
        }
        return util_1.bufToStr(newBuf);
    };
    SBCSDecoder.prototype.end = function () {
    };
    return SBCSDecoder;
}());
exports._sbcs = SBCSCodec;
//# sourceMappingURL=sbcs-codec.js.map