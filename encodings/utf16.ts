"use strict";
import {detectEncoding, strToBuf} from '../../util/util';

// Note: UTF16-LE (or UCS2) codec is Node.js native. See encodings/internal.js

// == UTF16-BE codec. ==========================================================

export let utf16be = Utf16BECodec;

class Utf16BECodec {
    encoder = Utf16BEEncoder;
    decoder = Utf16BEDecoder;
    bomAware = true;

    constructor () {

    }
}


// -- Encoding

class Utf16BEEncoder {
    constructor () {

    }

    write (str: string) {
        let buf = strToBuf( str );
        let bufView = new Uint8Array (bufView);

        for (var i = 0; i < buf.byteLength; i += 2) {
            var tmp = bufView[i]; bufView[i] = bufView[i+1]; bufView[i+1] = tmp;
        }
        return buf;
    }

    end() {

    }
}


// -- Decoding

class Utf16BEDecoder {
    overflowByte: number;    

    constructor () {
      this.overflowByte = -1;                
    }

    write ( buf: ArrayBuffer ) {
        if (buf.byteLength == 0)
            return '';

        let buf2 = new ArrayBuffer(buf.byteLength + 1),
            buf2View = new Uint8Array(buf2),
            i = 0, j = 0;

        if (this.overflowByte !== -1) {
            buf2[0] = buf[0];
            buf2[1] = this.overflowByte;
            i = 1; j = 2;
        }

        for (; i < buf.length-1; i += 2, j+= 2) {
            buf2[j] = buf[i+1];
            buf2[j+1] = buf[i];
        }

        this.overflowByte = (i == buf.length-1) ? buf[buf.length-1] : -1;

        return buf2.slice(0, j).toString('ucs2');
    }

    end () {

    }
}



// == UTF-16 codec =============================================================
// Decoder chooses automatically from UTF-16LE and UTF-16BE using BOM and space-based heuristic.
// Defaults to UTF-16LE, as it's prevalent and default in Node.
// http://en.wikipedia.org/wiki/UTF-16 and http://encoding.spec.whatwg.org/#utf-16le
// Decoder default can be changed: iconv.decode(buf, 'utf16', {defaultEncoding: 'utf-16be'});

// Encoder uses UTF-16LE and prepends BOM (which can be overridden with addBOM: false).

export let utf16 = Utf16Codec;

class Utf16Codec {
    iconv: any;
    encoder = Utf16Encoder;
    decoder = Utf16Decoder;

    constructor ( codecOptions: any, iconv: any ) {
        this.iconv = iconv;
    }
}

// -- Encoding (pass-through)

class Utf16Encoder {
    constructor (options: any, codec: any) {
        options = options || {};
        if (options.addBOM === undefined)
            options.addBOM = true;
        this.encoder = codec.iconv.getEncoder('utf-16le', options);     
    }

    write ( str: string ) {
        return this.encoder.write(str);            
    }

    end () {
        return this.encoder,end();
    }
}



// -- Decoding

class Utf16Decoder { 
    decoder: any;
    initialBytes: any;
    initialBytesLen = 0;
    options: any;
    iconv：any;    

    constructor (options: any, codec: any) {
        this.decoder = null;
        this.initialBytes = [];
        this.initialBytesLen = 0;

        this.options = options || {};
        this.iconv = codec.iconv;
    }

    write ( buf: ArrayBuffer ) {
        if (!this.decoder) {
        // Codec is not chosen yet. Accumulate initial bytes.
            this.initialBytes.push(buf);
            this.initialBytesLen += buf.length;
            
            if (this.initialBytesLen < 16) // We need more bytes to use space heuristic (see below)
                return '';

            // We have enough bytes -> detect endianness.
            var buf = Buffer.concat(this.initialBytes),
                encoding = detectEncoding(buf, this.options.defaultEncoding);
            this.decoder = this.iconv.getDecoder(encoding, this.options);
            this.initialBytes.length = this.initialBytesLen = 0;
        }

        return this.decoder.write(buf);
    }

    end () {
        if (!this.decoder) {
            var buf = Buffer.concat(this.initialBytes),
                encoding = detectEncoding(buf, this.options.defaultEncoding);
            this.decoder = this.iconv.getDecoder(encoding, this.options);

            var res = this.decoder.write(buf),
                trail = this.decoder.end();

            return trail ? (res + trail) : res;
        }
        return this.decoder.end();
    }
}





