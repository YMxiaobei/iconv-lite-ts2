"use strict";
import {PrependBOM, StripBOM} from './bom-handling';
import {encodings} from '../encodings';
import {concatBuf, strToBuf} from "../util/util";

// Some environments don't have global Buffer (e.g. React Native).
// Solution would be installing npm modules "buffer" and "stream" explicitly.
//let Buffer = require("buffer").Buffer;

/*let bomHandling = require("./bom-handling"),
    iconv = module.exports;*/

export class Iconv {
    encodings = null;
    defaultCharUnicode = '�';
    defaultCharSingleByte = '?';
    _codecDataCache: any = {};
    skipDecodeWarning: boolean;

    constructor () {
        if ("Ā" != "\u0100") {
            console.error("iconv-lite warning: javascript files use encoding different from utf-8. See https://github.com/ashtuchkin/iconv-lite/wiki/Javascript-source-file-encodings for more info.");
        }
    }

    encode (str: string, encoding: string, options?: any): ArrayBuffer {
        str = "" + (str || ""); // Ensure string.

        let encoder = this.getEncoder(encoding, options);

        let res = encoder.write(str);
        let trail = encoder.end();

        return (trail && trail.length > 0) ? concatBuf([res, trail]) : res;
    }

    decode(buf: ArrayBuffer, encoding: string, options?: any) {
        if (typeof buf === 'string') {
            if (!this.skipDecodeWarning) {
                console.error('Iconv-lite warning: decode()-ing strings is deprecated. Refer to https://github.com/ashtuchkin/iconv-lite/wiki/Use-Buffers-when-decoding');
                this.skipDecodeWarning = true;
            }

            buf = strToBuf("" + (buf || "")); // Ensure buffer.
        }

        let decoder = this.getDecoder(encoding, options);

        let res = decoder.write(buf);
        let trail = decoder.end();

        return trail ? (res + trail) : res;
    }

    private encodingExists(enc: string) {
        try {
            this.getCodec(enc);
            return true;
        } catch (e) {
            return false;
        }
    }

    toEncoding = this.encode;
    fromEncoding = this.decode;

    private getCodec(encoding: string) {
        if (!this.encodings)
        this.encodings = encodings;
        // Canonicalize encoding name: strip all non-alphanumeric chars and appended year.
        let enc = (''+encoding).toLowerCase().replace(/[^0-9a-z]|:\d{4}$/g, "");

        // Traverse iconv.encodings to find actual codec.
        let codecOptions: any = {};
        while (true) {
            let codec = this._codecDataCache[enc];
            if (codec)
                return codec;

            let codecDef = this.encodings[enc];

            let codecDefType = typeof codecDef;

            if ( codecDefType === 'string' ) {
              enc = codecDef;
            } else if ( codecDefType === 'object' ) {
              for (let key in codecDef)
                codecOptions[key] = codecDef[key];

              if (!codecOptions.encodingName)
                codecOptions.encodingName = enc;

              enc = codecDef.type;
            } else if ( codecDef ) {
              if (!codecOptions.encodingName)
                codecOptions.encodingName = enc;

              // The codec function must load all tables and return object with .encoder and .decoder methods.
              // It'll be called only once (for each different options object).
              codec = new codecDef(codecOptions, this);


              this._codecDataCache[codecOptions.encodingName] = codec; // Save it to be reused later.
              return codec;
            } else {
              throw new Error("Encoding not recognized: '" + encoding + "' (searched as: '"+enc+"')");
            }
        }
    }

    private getEncoder(encoding: string, options?: any) {
        let codec = this.getCodec(encoding),
            encoder = new codec.encoder(options, codec);

        if (codec.bomAware && options && options.addBOM)
            encoder = new PrependBOM(encoder, options);

        console.log ( encoder, 'hahahahhahahahah' );
        return encoder;
    }

    private getDecoder(encoding: string, options?: any) {
        let codec = this.getCodec(encoding),
            decoder = new codec.decoder(options, codec);

        if (codec.bomAware && !(options && options.stripBOM === false))
            decoder = new StripBOM(decoder, options);

        return decoder;
    }
}

// All codecs and aliases are kept here, keyed by encoding name/alias.
// They are lazy loaded in `iconv.getCodec` from `encodings/index.js`.
//iconv.encodings = null;

// Characters emitted in case of error.
//iconv.defaultCharUnicode = '�';
//iconv.defaultCharSingleByte = '?';

// Public API.
/*iconv.encode = function encode(str, encoding, options) {
    str = "" + (str || ""); // Ensure string.

    let encoder = iconv.getEncoder(encoding, options);

    let res = encoder.write(str);
    let trail = encoder.end();

    return (trail && trail.length > 0) ? Buffer.concat([res, trail]) : res;
}*/

/*iconv.decode = function decode(buf, encoding, options) {
    if (typeof buf === 'string') {
        if (!iconv.skipDecodeWarning) {
            console.error('Iconv-lite warning: decode()-ing strings is deprecated. Refer to https://github.com/ashtuchkin/iconv-lite/wiki/Use-Buffers-when-decoding');
            iconv.skipDecodeWarning = true;
        }

        buf = new Buffer("" + (buf || ""), "binary"); // Ensure buffer.
    }

    let decoder = iconv.getDecoder(encoding, options);

    let res = decoder.write(buf);
    let trail = decoder.end();

    return trail ? (res + trail) : res;
}*/

/*iconv.encodingExists = function encodingExists(enc) {
    try {
        iconv.getCodec(enc);
        return true;
    } catch (e) {
        return false;
    }
}*/

// Legacy aliases to convert functions
//iconv.toEncoding = iconv.encode;
//iconv.fromEncoding = iconv.decode;

// Search for a codec in iconv.encodings. Cache codec data in iconv._codecDataCache.
//iconv._codecDataCache = {};
/*iconv.getCodec = function getCodec(encoding) {
    if (!iconv.encodings)
        iconv.encodings = require("../encodings"); // Lazy load all encoding definitions.

    // Canonicalize encoding name: strip all non-alphanumeric chars and appended year.
    let enc = (''+encoding).toLowerCase().replace(/[^0-9a-z]|:\d{4}$/g, "");

    // Traverse iconv.encodings to find actual codec.
    let codecOptions = {};
    while (true) {
        let codec = iconv._codecDataCache[enc];
        if (codec)
            return codec;

        let codecDef = iconv.encodings[enc];

        switch (typeof codecDef) {
            case "string": // Direct alias to other encoding.
                enc = codecDef;
                break;

            case "object": // Alias with options. Can be layered.
                for (let key in codecDef)
                    codecOptions[key] = codecDef[key];

                if (!codecOptions.encodingName)
                    codecOptions.encodingName = enc;

                enc = codecDef.type;
                break;

            case "function": // Codec itself.
                if (!codecOptions.encodingName)
                    codecOptions.encodingName = enc;

                // The codec function must load all tables and return object with .encoder and .decoder methods.
                // It'll be called only once (for each different options object).
                codec = new codecDef(codecOptions, iconv);

                iconv._codecDataCache[codecOptions.encodingName] = codec; // Save it to be reused later.
                return codec;

            default:
                throw new Error("Encoding not recognized: '" + encoding + "' (searched as: '"+enc+"')");
        }
    }
}*/

/*iconv.getEncoder = function getEncoder(encoding, options) {
    let codec = iconv.getCodec(encoding),
        encoder = new codec.encoder(options, codec);

    if (codec.bomAware && options && options.addBOM)
        encoder = new bomHandling.PrependBOM(encoder, options);

    return encoder;
}*/

/*iconv.getDecoder = function getDecoder(encoding, options) {
    let codec = iconv.getCodec(encoding),
        decoder = new codec.decoder(options, codec);

    if (codec.bomAware && !(options && options.stripBOM === false))
        decoder = new bomHandling.StripBOM(decoder, options);

    return decoder;
}*/


// Load extensions in Node. All of them are omitted in Browserify build via 'browser' field in package.json.
/*let nodeVer = typeof process !== 'undefined' && process.versions && process.versions.node;
if (nodeVer) {

    // Load streaming support in Node v0.10+
    let nodeVerArr = nodeVer.split(".").map(Number);
    if (nodeVerArr[0] > 0 || nodeVerArr[1] >= 10) {
        require("./streams")(iconv);
    }

    // Load Node primitive extensions.
    require("./extend-node")(iconv);
}*/


