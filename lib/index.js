"use strict";
exports.__esModule = true;
var bom_handling_1 = require("./bom-handling");
var encodings_1 = require("../encodings");
var util_1 = require("../util/util");
// Some environments don't have global Buffer (e.g. React Native).
// Solution would be installing npm modules "buffer" and "stream" explicitly.
//let Buffer = require("buffer").Buffer;
/*let bomHandling = require("./bom-handling"),
    iconv = module.exports;*/
var Iconv = /** @class */ (function () {
    function Iconv() {
        this.encodings = null;
        this.defaultCharUnicode = '�';
        this.defaultCharSingleByte = '?';
        this._codecDataCache = {};
        this.toEncoding = this.encode;
        this.fromEncoding = this.decode;
        if ("Ā" != "\u0100") {
            console.error("iconv-lite warning: javascript files use encoding different from utf-8. See https://github.com/ashtuchkin/iconv-lite/wiki/Javascript-source-file-encodings for more info.");
        }
    }
    Iconv.prototype.encode = function (str, encoding, options) {
        str = "" + (str || ""); // Ensure string.
        var encoder = this.getEncoder(encoding, options);
        var res = encoder.write(str);
        var trail = encoder.end();
        return (trail && trail.length > 0) ? util_1.concatBuf([res, trail]) : res;
    };
    Iconv.prototype.decode = function (buf, encoding, options) {
        if (typeof buf === 'string') {
            if (!this.skipDecodeWarning) {
                console.error('Iconv-lite warning: decode()-ing strings is deprecated. Refer to https://github.com/ashtuchkin/iconv-lite/wiki/Use-Buffers-when-decoding');
                this.skipDecodeWarning = true;
            }
            buf = util_1.strToBuf("" + (buf || "")); // Ensure buffer.
        }
        var decoder = this.getDecoder(encoding, options);
        var res = decoder.write(buf);
        var trail = decoder.end();
        return trail ? (res + trail) : res;
    };
    Iconv.prototype.encodingExists = function (enc) {
        try {
            this.getCodec(enc);
            return true;
        }
        catch (e) {
            return false;
        }
    };
    Iconv.prototype.getCodec = function (encoding) {
        if (!this.encodings)
            this.encodings = encodings_1.encodings;
        // Canonicalize encoding name: strip all non-alphanumeric chars and appended year.
        var enc = ('' + encoding).toLowerCase().replace(/[^0-9a-z]|:\d{4}$/g, "");
        // Traverse iconv.encodings to find actual codec.
        var codecOptions = {};
        while (true) {
            var codec = this._codecDataCache[enc];
            if (codec)
                return codec;
            var codecDef = this.encodings[enc];
            var codecDefType = typeof codecDef;
            if (codecDefType === 'string') {
                enc = codecDef;
            }
            else if (codecDefType === 'object') {
                for (var key in codecDef)
                    codecOptions[key] = codecDef[key];
                if (!codecOptions.encodingName)
                    codecOptions.encodingName = enc;
                enc = codecDef.type;
            }
            else if (codecDef) {
                if (!codecOptions.encodingName)
                    codecOptions.encodingName = enc;
                // The codec function must load all tables and return object with .encoder and .decoder methods.
                // It'll be called only once (for each different options object).
                codec = new codecDef(codecOptions, this);
                this._codecDataCache[codecOptions.encodingName] = codec; // Save it to be reused later.
                return codec;
            }
            else {
                throw new Error("Encoding not recognized: '" + encoding + "' (searched as: '" + enc + "')");
            }
        }
    };
    Iconv.prototype.getEncoder = function (encoding, options) {
        var codec = this.getCodec(encoding), encoder = new codec.encoder(options, codec);
        if (codec.bomAware && options && options.addBOM)
            encoder = new bom_handling_1.PrependBOM(encoder, options);
        console.log(encoder, 'hahahahhahahahah');
        return encoder;
    };
    Iconv.prototype.getDecoder = function (encoding, options) {
        var codec = this.getCodec(encoding), decoder = new codec.decoder(options, codec);
        if (codec.bomAware && !(options && options.stripBOM === false))
            decoder = new bom_handling_1.StripBOM(decoder, options);
        return decoder;
    };
    return Iconv;
}());
exports.Iconv = Iconv;
