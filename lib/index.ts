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
