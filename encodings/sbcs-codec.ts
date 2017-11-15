import {bufToStr} from "../util/util";

// Single-byte codec. Needs a 'chars' string parameter that contains 256 or 128 chars that
// correspond to encoded bytes (if 128 - then lower half is ASCII). 

export let _sbcs = SBCSCodec;

class SBCSCodec {
    encoder = SBCSEncoder;
    decoder = SBCSDecoder;

    decodeBuf: ArrayBuffer;
    encodeBuf: ArrayBuffer;

    constructor (codecOptions: any, iconv: any) {
        if (!codecOptions)
            throw new Error("SBCS codec is called without the data.")
        
        // Prepare char buffer for decoding.
        if (!codecOptions.chars || (codecOptions.chars.length !== 128 && codecOptions.chars.length !== 256))
            throw new Error("Encoding '"+codecOptions.type+"' has incorrect 'chars' (must be of len 128 or 256)");
        
        if (codecOptions.chars.length === 128) {
            let asciiString = "";
            for (let i = 0; i < 128; i++)
                asciiString += String.fromCharCode(i);
            codecOptions.chars = asciiString + codecOptions.chars;
        }

        this.decodeBuf = new ArrayBuffer(codecOptions.chars);

        
        // Encoding buffer.
        let encodeBuf = new ArrayBuffer(65536);
        let encodeBufView = new Uint8Array(encodeBuf);

        for ( let i = 0; i < 65536; i++ ) {
            encodeBufView[i] = iconv.defaultCharSingleByte.charCodeAt(0);
        }

        for (let i = 0; i < codecOptions.chars.length; i++)
            encodeBufView[codecOptions.chars.charCodeAt(i)] = i;

        this.encodeBuf = encodeBuf;      
    }
}


//--------------------------------------------------Encoder-----------------------------------------------------

class SBCSEncoder {
    encodeBuf: ArrayBuffer;
    encodeBufView: Uint8Array;

    constructor ( options: any, codec: any ) {
        this.encodeBuf = codec.encodeBuf;
        this.encodeBufView = new Uint8Array ( this.encodeBuf );
    }

    write ( str: string ) {
        let buf = new ArrayBuffer(str.length);
        let bufView = new Uint8Array(buf);
        for (let i = 0; i < str.length; i++)
            bufView[i] = this.encodeBufView[str.charCodeAt(i)];
        
        return buf;
    }

    end () {

    }
}


//-----------------------------------Decoder--------------------------------------
class SBCSDecoder {
    decodeBuf: ArrayBuffer;
    decodeBufView: Uint8Array;

    constructor ( options: any, codec: any ) {
        this.decodeBuf = codec.decodeBuf;
        this.decodeBufView = new Uint8Array(this.decodeBuf);
    }

    write ( buf: ArrayBuffer ) {
        let bufView = new Uint8Array(buf);
        let decodeBuf = this.decodeBuf;
        let decodeBufView = new Uint8Array (decodeBuf);
        let newBuf = new ArrayBuffer(buf.byteLength*2);
        let newBufView = new Uint8Array (newBuf);
        let idx1 = 0, idx2 = 0;
        for (let i = 0; i < buf.byteLength; i++) {
            idx1 = bufView[i]*2; idx2 = i*2;
            newBufView[idx2] = decodeBufView[idx1];
            newBuf[idx2+1] = decodeBufView[idx1+1];
        }
        return bufToStr(newBuf);
    }

    end () {

    }
}

