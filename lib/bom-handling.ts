"use strict";

var BOMChar = '\uFEFF';

//exports.PrependBOM = PrependBOMWrapper;

export class PrependBOM {
    encoder: any;
    addBOM: boolean;

    constructor (encoder: any, options?: any) {
        this.encoder = encoder;
        this.addBOM = true;
    }

    write (str: string) {
        if (this.addBOM) {
            str = BOMChar + str;
            this.addBOM = false;
        }

        return this.encoder.write(str);
    }

    end() {
        return this.encoder.end();
    }
}

/*function PrependBOMWrapper(encoder, options) {
    this.encoder = encoder;
    this.addBOM = true;
}
*/
/*PrependBOMWrapper.prototype.write = function(str) {
    if (this.addBOM) {
        str = BOMChar + str;
        this.addBOM = false;
    }

    return this.encoder.write(str);
}*/

/*PrependBOMWrapper.prototype.end = function() {
    return this.encoder.end();
}*/


//------------------------------------------------------------------------------

export class StripBOM {
    decoder: any;
    pass: boolean;
    options: any;

    constructor (decoder: any, options?: any) {
        this.decoder = decoder;
        this.pass = false;
        this.options = options || {};
    }

    write (buf: ArrayBuffer) {
        var res = this.decoder.write(buf);
        if (this.pass || !res)
            return res;

        if (res[0] === BOMChar) {
            res = res.slice(1);
            if (typeof this.options.stripBOM === 'function')
                this.options.stripBOM();
        }

        this.pass = true;
        return res;
    }

    end () {
        return this.decoder.end();
    }
}

/*exports.StripBOM = StripBOMWrapper;
function StripBOMWrapper(decoder, options) {
    this.decoder = decoder;
    this.pass = false;
    this.options = options || {};
}*/

/*StripBOMWrapper.prototype.write = function(buf) {
    var res = this.decoder.write(buf);
    if (this.pass || !res)
        return res;

    if (res[0] === BOMChar) {
        res = res.slice(1);
        if (typeof this.options.stripBOM === 'function')
            this.options.stripBOM();
    }

    this.pass = true;
    return res;
}*/

/*StripBOMWrapper.prototype.end = function() {
    return this.decoder.end();
}*/
