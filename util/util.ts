export function concatBuf(bufs: ArrayBuffer[]) {
    let len: number,
        bufViews: Uint8Array[] = [],
        newBuf: ArrayBuffer,
        index = -1,
        newBufView: Uint8Array;

    for (let buf of bufs) {
        len += buf.byteLength;
        bufViews.push(new Uint8Array(buf));
    }

    newBuf = new ArrayBuffer(len);
    newBufView = new Uint8Array(newBuf);

    for (let bufView of bufViews) {
        bufView.forEach((value) => newBufView[++index])
    }

    return newBuf;
}

export function bufToStr(buf: ArrayBuffer, type?:string) {
    let bufView = new Uint16Array(buf);
    let str: string = '';

    bufView.forEach(value => str += String.fromCharCode(value));
    return str;
}

export function strToBuf (str: string, type?: string) {
    let newBuf = new ArrayBuffer(str.length * 2);
    let newBufView = new Uint16Array (newBuf);

    for ( let i = 0, len = str.length; i < len; i++ ) {
        newBufView[ i ] = str.charCodeAt(i);
    }   

    return newBuf;
}

export function findIdx(table, val) {
    if (table[0] > val)
        return -1;

    let l = 0, r = table.length;
    while (l < r-1) { // always table[l] <= val < table[r]
        let mid = l + Math.floor((r-l+1)/2);
        if (table[mid] <= val)
            l = mid;
        else
            r = mid;
    }
    return l;
}

export function detectEncoding(buf, defaultEncoding) {
    var enc = defaultEncoding || 'utf-16le';

    if (buf.length >= 2) {
        // Check BOM.
        if (buf[0] == 0xFE && buf[1] == 0xFF) // UTF-16BE BOM
            enc = 'utf-16be';
        else if (buf[0] == 0xFF && buf[1] == 0xFE) // UTF-16LE BOM
            enc = 'utf-16le';
        else {
            // No BOM found. Try to deduce encoding from initial content.
            // Most of the time, the content has ASCII chars (U+00**), but the opposite (U+**00) is uncommon.
            // So, we count ASCII as if it was LE or BE, and decide from that.
            var asciiCharsLE = 0, asciiCharsBE = 0, // Counts of chars in both positions
                _len = Math.min(buf.length - (buf.length % 2), 64); // Len is always even.

            for (var i = 0; i < _len; i += 2) {
                if (buf[i] === 0 && buf[i+1] !== 0) asciiCharsBE++;
                if (buf[i] !== 0 && buf[i+1] === 0) asciiCharsLE++;
            }

            if (asciiCharsBE > asciiCharsLE)
                enc = 'utf-16be';
            else if (asciiCharsBE < asciiCharsLE)
                enc = 'utf-16le';
        }
    }

    return enc;
}

export function writeBuf (buf: ArrayBuffer, content: any, startIndex?: number, endInex?: number) {
    return 0;
}