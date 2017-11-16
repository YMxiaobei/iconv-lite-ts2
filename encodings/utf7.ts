
// UTF-7 codec, according to https://tools.ietf.org/html/rfc2152
// See also below a UTF-7-IMAP codec, according to http://tools.ietf.org/html/rfc3501#section-5.1.3

import {bufToStr, strToBuf, writeBuf} from "../util/util";



let nonDirectChars = /[^A-Za-z0-9'\(\),-\.\/:\? \n\r\t]+/g;


class Utf7Codec {
    iconv: any;
    encoder = Utf7Encoder;
    decoder = Utf7Decoder;
    bomAware = true;

    constructor (codecOptions: any, iconv: any) {
        this.iconv = iconv;
    }
}



// -- Encoding

class Utf7Encoder {
    iconv: any;

    constructor (options: any, codec: any) {
        this.iconv = codec.iconv;
    }

    write ( str: string ) {
        return strToBuf(str.replace(nonDirectChars, function(chunk) {
            return "+" + (chunk === '+' ? '' :
                this.iconv.encode(chunk, 'utf16-be').toString('base64').replace(/=+$/, ''))
                + "-";
        }.bind(this)));
    }

    end () {

    }
}


// -- Decoding

let base64Regex = /[A-Za-z0-9\/+]/;
let base64Chars = [];
for (let i = 0; i < 256; i++)
    base64Chars[i] = base64Regex.test(String.fromCharCode(i));

let plusChar = '+'.charCodeAt(0),
    minusChar = '-'.charCodeAt(0),
    andChar = '&'.charCodeAt(0);

class Utf7Decoder {
    iconv: any;
    inBase64: boolean;
    base64Accum: string;

    constructor (options: any, codec: any) {
        this.iconv = codec.iconv;
        this.inBase64 = false;
        this.base64Accum = '';
    }

    write (buf: ArrayBuffer) {
        let res = "", lastI = 0,
            inBase64 = this.inBase64,
            bufView = new Uint8Array(buf),
            base64Accum = this.base64Accum;

        // The decoder is more involved as we must handle chunks in stream.

        for (let i = 0; i < buf.byteLength; i++) {
            if (!inBase64) { // We're in direct mode.
                // Write direct chars until '+'
                if (bufView[i] == plusChar) {
                    res += this.iconv.decode(buf.slice(lastI, i), "ascii"); // Write direct chars.
                    lastI = i+1;
                    inBase64 = true;
                }
            } else { // We decode base64.
                if (!base64Chars[bufView[i]]) { // Base64 ended.
                    if (i == lastI && bufView[i] == minusChar) {// "+-" -> "+"
                        res += "+";
                    } else {
                        let b64str = base64Accum + buf.slice(lastI, i).toString();
                        res += this.iconv.decode(new strToBuf(b64str, 'base64'), "utf16-be");
                    }

                    if (bufView[i] != minusChar) // Minus is absorbed after base64.
                        i--;

                    lastI = i+1;
                    inBase64 = false;
                    base64Accum = '';
                }
            }
        }

        if (!inBase64) {
            res += this.iconv.decode(buf.slice(lastI), "ascii"); // Write direct chars.
        } else {
            let b64str = base64Accum + buf.slice(lastI).toString();

            let canBeDecoded = b64str.length - (b64str.length % 8); // Minimal chunk: 2 quads -> 2x3 bytes -> 3 chars.
            base64Accum = b64str.slice(canBeDecoded); // The rest will be decoded in future.
            b64str = b64str.slice(0, canBeDecoded);

            res += this.iconv.decode(new strToBuf(b64str, 'base64'), "utf16-be");
        }

        this.inBase64 = inBase64;
        this.base64Accum = base64Accum;

        return res;
    }

    end () {
        let res = "";
        if (this.inBase64 && this.base64Accum.length > 0)
            res = this.iconv.decode(strToBuf(this.base64Accum, 'base64'), "utf16-be");

        this.inBase64 = false;
        this.base64Accum = '';
        return res;
    }
}

// UTF-7-IMAP codec.
// RFC3501 Sec. 5.1.3 Modified UTF-7 (http://tools.ietf.org/html/rfc3501#section-5.1.3)
// Differences:
//  * Base64 part is started by "&" instead of "+"
//  * Direct characters are 0x20-0x7E, except "&" (0x26)
//  * In Base64, "," is used instead of "/"
//  * Base64 must not be used to represent direct characters.
//  * No implicit shift back from Base64 (should always end with '-')
//  * String must end in non-shifted position.
//  * "-&" while in base64 is not allowed.




class Utf7IMAPCodec {
    iconv: any;
    encoder = Utf7IMAPEncoder;
    decoder = Utf7IMAPDecoder;
    bomAware = true;

    constructor (codecOptions: any, iconv: any) {
        this.iconv = iconv;
    }
}

// -- Encoding

class Utf7IMAPEncoder {
    iconv: any;
    inBase64: boolean;
    base64Accum: ArrayBuffer;
    base64AccumV: Uint8Array;
    base64AccumIdx: number;

    constructor (options: any, codec: any) {
        this.iconv = codec.iconv;
        this.inBase64 = false;
        this.base64Accum = new ArrayBuffer(6);
        this.base64AccumV = new Uint8Array(this.base64Accum);
        this.base64AccumIdx = 0;
    }

    write ( str: string ) {
        let inBase64 = this.inBase64,
            base64Accum = this.base64Accum,
            base64AccumV = this.base64AccumV,
            base64AccumIdx = this.base64AccumIdx,
            buf = new ArrayBuffer(str.length*5 + 10), bufIdx = 0,
            bufView = new Uint8Array(buf);

        for (let i = 0; i < str.length; i++) {
            let uChar = str.charCodeAt(i);
            if (0x20 <= uChar && uChar <= 0x7E) { // Direct character or '&'.
                if (inBase64) {
                    if (base64AccumIdx > 0) {
                        bufIdx += writeBuf(buf, bufToStr(base64Accum.slice(0, base64AccumIdx), 'base64').replace(/\//g, ',').replace(/=+$/, ''), bufIdx);
                        base64AccumIdx = 0;
                    }

                    bufView[bufIdx++] = minusChar; // Write '-', then go to direct mode.
                    inBase64 = false;
                }

                if (!inBase64) {
                    bufView[bufIdx++] = uChar; // Write direct character

                    if (uChar === andChar)  // Ampersand -> '&-'
                        bufView[bufIdx++] = minusChar;
                }

            } else { // Non-direct character
                if (!inBase64) {
                    bufView[bufIdx++] = andChar; // Write '&', then go to base64 mode.
                    inBase64 = true;
                }
                if (inBase64) {
                    base64Accum[base64AccumIdx++] = uChar >> 8;
                    base64Accum[base64AccumIdx++] = uChar & 0xFF;

                    if (base64AccumIdx == base64Accum.byteLength) {
                        bufIdx += writeBuf(buf, bufToStr(base64Accum, 'base64').replace(/\//g, ','), bufIdx);
                        base64AccumIdx = 0;
                    }
                }
            }
        }

        this.inBase64 = inBase64;
        this.base64AccumIdx = base64AccumIdx;

        return buf.slice(0, bufIdx);
    }

    end () {
        let buf = new ArrayBuffer(10), bufIdx = 0;
        let bufView = new Uint8Array(buf);
        if (this.inBase64) {
            if (this.base64AccumIdx > 0) {
                bufIdx += writeBuf(
                    buf,
                    bufToStr(this.base64Accum.slice(0, this.base64AccumIdx), 'base64')
                    .replace(/\//g, ',')
                    .replace(/=+$/, ''),
                    bufIdx
                );
                this.base64AccumIdx = 0;
            }

            bufView[bufIdx++] = minusChar; // Write '-', then go to direct mode.
            this.inBase64 = false;
        }

        return buf.slice(0, bufIdx);
    }
}


// -- Decoding

let base64IMAPChars = base64Chars.slice();
base64IMAPChars[','.charCodeAt(0)] = true;

class Utf7IMAPDecoder {
    iconv: any;
    inBase64: boolean;
    base64Accum: string;

    constructor (options: any, codec: any) {
        this.iconv = codec.iconv;
        this.inBase64 = false;
        this.base64Accum = '';
    }

    write (buf: ArrayBuffer) {
        let bufView = new Uint8Array(buf),
            res = "", lastI = 0,
            inBase64 = this.inBase64,
            base64Accum = this.base64Accum;

        // The decoder is more involved as we must handle chunks in stream.
        // It is forgiving, closer to standard UTF-7 (for example, '-' is optional at the end).

        for (let i = 0; i < buf.byteLength; i++) {
            if (!inBase64) { // We're in direct mode.
                // Write direct chars until '&'
                if (bufView[i] == andChar) {
                    res += this.iconv.decode(buf.slice(lastI, i), "ascii"); // Write direct chars.
                    lastI = i+1;
                    inBase64 = true;
                }
            } else { // We decode base64.
                if (!base64IMAPChars[bufView[i]]) { // Base64 ended.
                    if (i == lastI && bufView[i] == minusChar) { // "&-" -> "&"
                        res += "&";
                    } else {
                        let b64str = base64Accum + bufToStr(buf.slice(lastI, i)).replace(/,/g, '/');
                        res += this.iconv.decode(new strToBuf(b64str, 'base64'), "utf16-be");
                    }

                    if (bufView[i] != minusChar) // Minus may be absorbed after base64.
                        i--;

                    lastI = i+1;
                    inBase64 = false;
                    base64Accum = '';
                }
            }
        }

        if (!inBase64) {
            res += this.iconv.decode(buf.slice(lastI), "ascii"); // Write direct chars.
        } else {
            let b64str = base64Accum + bufToStr(buf.slice(lastI)).replace(/,/g, '/');

            let canBeDecoded = b64str.length - (b64str.length % 8); // Minimal chunk: 2 quads -> 2x3 bytes -> 3 chars.
            base64Accum = b64str.slice(canBeDecoded); // The rest will be decoded in future.
            b64str = b64str.slice(0, canBeDecoded);

            res += this.iconv.decode(strToBuf(b64str, 'base64'), "utf16-be");
        }

        this.inBase64 = inBase64;
        this.base64Accum = base64Accum;

        return res;
    }

    end () {
        let res = "";
        if (this.inBase64 && this.base64Accum.length > 0)
            res = this.iconv.decode(strToBuf(this.base64Accum, 'base64'), "utf16-be");

        this.inBase64 = false;
        this.base64Accum = '';
        return res;
    }
}

export let utf7 = Utf7Codec;
export let unicode11utf7 = 'utf7'; // Alias UNICODE-1-1-UTF-7
export let utf7imap = Utf7IMAPCodec;



