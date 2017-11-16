"use strict";
exports.__esModule = true;
var util_1 = require("../util/util");
var UNASSIGNED = -1, GB18030_CODE = -2, SEQ_START = -10, NODE_START = -1000, UNASSIGNED_NODE = new Array(0x100), DEF_CHAR = -1;
for (var i = 0; i < 0x100; i++)
    UNASSIGNED_NODE[i] = UNASSIGNED;
var DBCSCodec = (function () {
    function DBCSCodec(codecOptions, iconv) {
        this.decodeTables = [];
        this.decodeTableSeq = [];
        this.encodeTable = [];
        this.encodeTableSeq = [];
        this.encoder = DBCSEncoder;
        this.decoder = DBCSDecoder;
        this.encodingName = codecOptions.encodingName;
        if (!codecOptions)
            throw new Error("DBCS codec is called without the data.");
        if (!codecOptions.table)
            throw new Error("Encoding '" + this.encodingName + "' has no data.");
        var mappingTable = codecOptions.table();
        this.decodeTables[0] = UNASSIGNED_NODE.slice(0);
        for (var i = 0; i < mappingTable.length; i++)
            this._addDecodeChunk(mappingTable[i]);
        this.defaultCharUnicode = iconv.defaultCharUnicode;
        var skipEncodeChars = {};
        if (codecOptions.encodeSkipVals)
            for (var i = 0; i < codecOptions.encodeSkipVals.length; i++) {
                var val = codecOptions.encodeSkipVals[i];
                if (typeof val === 'number')
                    skipEncodeChars[val] = true;
                else
                    for (var j = val.from; j <= val.to; j++)
                        skipEncodeChars[j] = true;
            }
        this._fillEncodeTable(0, 0, skipEncodeChars);
        if (codecOptions.encodeAdd) {
            for (var uChar in codecOptions.encodeAdd)
                if (Object.prototype.hasOwnProperty.call(codecOptions.encodeAdd, uChar))
                    this._setEncodeChar(uChar.charCodeAt(0), codecOptions.encodeAdd[uChar]);
        }
        this.defCharSB = this.encodeTable[0][iconv.defaultCharSingleByte.charCodeAt(0)];
        if (this.defCharSB === UNASSIGNED)
            this.defCharSB = this.encodeTable[0]['?'];
        if (this.defCharSB === UNASSIGNED)
            this.defCharSB = "?".charCodeAt(0);
        if (typeof codecOptions.gb18030 === 'function') {
            this.gb18030 = codecOptions.gb18030();
            var thirdByteNodeIdx = this.decodeTables.length;
            var thirdByteNode = this.decodeTables[thirdByteNodeIdx] = UNASSIGNED_NODE.slice(0);
            var fourthByteNodeIdx = this.decodeTables.length;
            var fourthByteNode = this.decodeTables[fourthByteNodeIdx] = UNASSIGNED_NODE.slice(0);
            for (var i = 0x81; i <= 0xFE; i++) {
                var secondByteNodeIdx = NODE_START - this.decodeTables[0][i];
                var secondByteNode = this.decodeTables[secondByteNodeIdx];
                for (var j = 0x30; j <= 0x39; j++)
                    secondByteNode[j] = NODE_START - thirdByteNodeIdx;
            }
            for (var i = 0x81; i <= 0xFE; i++)
                thirdByteNode[i] = NODE_START - fourthByteNodeIdx;
            for (var i = 0x30; i <= 0x39; i++)
                fourthByteNode[i] = GB18030_CODE;
        }
    }
    DBCSCodec.prototype._getDecodeTrieNode = function (addr) {
        var bytes = [];
        for (; addr > 0; addr >>= 8)
            bytes.push(addr & 0xFF);
        if (bytes.length == 0)
            bytes.push(0);
        var node = this.decodeTables[0];
        for (var i = bytes.length - 1; i > 0; i--) {
            var val = node[bytes[i]];
            if (val == UNASSIGNED) {
                node[bytes[i]] = NODE_START - this.decodeTables.length;
                this.decodeTables.push(node = UNASSIGNED_NODE.slice(0));
            }
            else if (val <= NODE_START) {
                node = this.decodeTables[NODE_START - val];
            }
            else
                throw new Error("Overwrite byte in " + this.encodingName + ", addr: " + addr.toString(16));
        }
        return node;
    };
    DBCSCodec.prototype._addDecodeChunk = function (chunk) {
        var curAddr = parseInt(chunk[0], 16);
        var writeTable = this._getDecodeTrieNode(curAddr);
        curAddr = curAddr & 0xFF;
        for (var k = 1; k < chunk.length; k++) {
            var part = chunk[k];
            if (typeof part === "string") {
                for (var l = 0; l < part.length;) {
                    var code = part.charCodeAt(l++);
                    if (0xD800 <= code && code < 0xDC00) {
                        var codeTrail = part.charCodeAt(l++);
                        if (0xDC00 <= codeTrail && codeTrail < 0xE000)
                            writeTable[curAddr++] = 0x10000 + (code - 0xD800) * 0x400 + (codeTrail - 0xDC00);
                        else
                            throw new Error("Incorrect surrogate pair in " + this.encodingName + " at chunk " + chunk[0]);
                    }
                    else if (0x0FF0 < code && code <= 0x0FFF) {
                        var len = 0xFFF - code + 2;
                        var seq = [];
                        for (var m = 0; m < len; m++)
                            seq.push(part.charCodeAt(l++));
                        writeTable[curAddr++] = SEQ_START - this.decodeTableSeq.length;
                        this.decodeTableSeq.push(seq);
                    }
                    else
                        writeTable[curAddr++] = code;
                }
            }
            else if (typeof part === "number") {
                var charCode = writeTable[curAddr - 1] + 1;
                for (var l = 0; l < part; l++)
                    writeTable[curAddr++] = charCode++;
            }
            else
                throw new Error("Incorrect type '" + typeof part + "' given in " + this.encodingName + " at chunk " + chunk[0]);
        }
        if (curAddr > 0xFF)
            throw new Error("Incorrect chunk in " + this.encodingName + " at addr " + chunk[0] + ": too long" + curAddr);
    };
    DBCSCodec.prototype._getEncodeBucket = function (uCode) {
        var high = uCode >> 8;
        if (this.encodeTable[high] === undefined)
            this.encodeTable[high] = UNASSIGNED_NODE.slice(0);
        return this.encodeTable[high];
    };
    DBCSCodec.prototype._setEncodeChar = function (uCode, dbcsCode) {
        var bucket = this._getEncodeBucket(uCode);
        var low = uCode & 0xFF;
        if (bucket[low] <= SEQ_START)
            this.encodeTableSeq[SEQ_START - bucket[low]][DEF_CHAR] = dbcsCode;
        else if (bucket[low] == UNASSIGNED)
            bucket[low] = dbcsCode;
    };
    DBCSCodec.prototype._setEncodeSequence = function (seq, dbcsCode) {
        var uCode = seq[0];
        var bucket = this._getEncodeBucket(uCode);
        var low = uCode & 0xFF;
        var node;
        if (bucket[low] <= SEQ_START) {
            node = this.encodeTableSeq[SEQ_START - bucket[low]];
        }
        else {
            node = {};
            if (bucket[low] !== UNASSIGNED)
                node[DEF_CHAR] = bucket[low];
            bucket[low] = SEQ_START - this.encodeTableSeq.length;
            this.encodeTableSeq.push(node);
        }
        for (var j = 1; j < seq.length - 1; j++) {
            var oldVal = node[uCode];
            if (typeof oldVal === 'object')
                node = oldVal;
            else {
                node = node[uCode] = {};
                if (oldVal !== undefined)
                    node[DEF_CHAR] = oldVal;
            }
        }
        uCode = seq[seq.length - 1];
        node[uCode] = dbcsCode;
    };
    DBCSCodec.prototype._fillEncodeTable = function (nodeIdx, prefix, skipEncodeChars) {
        var node = this.decodeTables[nodeIdx];
        for (var i = 0; i < 0x100; i++) {
            var uCode = node[i];
            var mbCode = prefix + i;
            if (skipEncodeChars[mbCode])
                continue;
            if (uCode >= 0)
                this._setEncodeChar(uCode, mbCode);
            else if (uCode <= NODE_START)
                this._fillEncodeTable(NODE_START - uCode, mbCode << 8, skipEncodeChars);
            else if (uCode <= SEQ_START)
                this._setEncodeSequence(this.decodeTableSeq[SEQ_START - uCode], mbCode);
        }
    };
    return DBCSCodec;
}());
exports.DBCSCodec = DBCSCodec;
var DBCSEncoder = (function () {
    function DBCSEncoder(options, codec) {
        this.leadSurrogate = -1;
        this.seqObj = undefined;
        this.encodeTable = codec.encodeTable;
        this.encodeTableSeq = codec.encodeTableSeq;
        this.defaultCharSingleByte = codec.defCharSB;
        this.gb18030 = codec.gb18030;
    }
    DBCSEncoder.prototype.write = function (str) {
        var newBuf = new ArrayBuffer(str.length * (this.gb18030 ? 4 : 3)), newBufView = new Uint8Array(newBuf), leadSurrogate = this.leadSurrogate, seqObj = this.seqObj, nextChar = -1, i = 0, j = 0;
        while (true) {
            var uCode = void 0;
            if (nextChar === -1) {
                if (i == str.length)
                    break;
                uCode = str.charCodeAt(i++);
            }
            else {
                uCode = nextChar;
                nextChar = -1;
            }
            if (0xD800 <= uCode && uCode < 0xE000) {
                if (uCode < 0xDC00) {
                    if (leadSurrogate === -1) {
                        leadSurrogate = uCode;
                        continue;
                    }
                    else {
                        leadSurrogate = uCode;
                        uCode = UNASSIGNED;
                    }
                }
                else {
                    if (leadSurrogate !== -1) {
                        uCode = 0x10000 + (leadSurrogate - 0xD800) * 0x400 + (uCode - 0xDC00);
                        leadSurrogate = -1;
                    }
                    else {
                        uCode = UNASSIGNED;
                    }
                }
            }
            else if (leadSurrogate !== -1) {
                nextChar = uCode;
                uCode = UNASSIGNED;
                leadSurrogate = -1;
            }
            var dbcsCode = UNASSIGNED;
            if (seqObj !== undefined && uCode != UNASSIGNED) {
                var resCode = seqObj[uCode];
                if (typeof resCode === 'object') {
                    seqObj = resCode;
                    continue;
                }
                else if (typeof resCode == 'number') {
                    dbcsCode = resCode;
                }
                else if (resCode == undefined) {
                    resCode = seqObj[DEF_CHAR];
                    if (resCode !== undefined) {
                        dbcsCode = resCode;
                        nextChar = uCode;
                    }
                    else {
                    }
                }
                seqObj = undefined;
            }
            else if (uCode >= 0) {
                var subtable = this.encodeTable[uCode >> 8];
                if (subtable !== undefined)
                    dbcsCode = subtable[uCode & 0xFF];
                if (dbcsCode <= SEQ_START) {
                    seqObj = this.encodeTableSeq[SEQ_START - dbcsCode];
                    continue;
                }
                if (dbcsCode == UNASSIGNED && this.gb18030) {
                    var idx = util_1.findIdx(this.gb18030.uChars, uCode);
                    if (idx != -1) {
                        var dbcsCode_1 = this.gb18030.gbChars[idx] + (uCode - this.gb18030.uChars[idx]);
                        newBufView[j++] = 0x81 + Math.floor(dbcsCode_1 / 12600);
                        dbcsCode_1 = dbcsCode_1 % 12600;
                        newBufView[j++] = 0x30 + Math.floor(dbcsCode_1 / 1260);
                        dbcsCode_1 = dbcsCode_1 % 1260;
                        newBufView[j++] = 0x81 + Math.floor(dbcsCode_1 / 10);
                        dbcsCode_1 = dbcsCode_1 % 10;
                        newBufView[j++] = 0x30 + dbcsCode_1;
                        continue;
                    }
                }
            }
            if (dbcsCode === UNASSIGNED)
                dbcsCode = this.defaultCharSingleByte;
            if (dbcsCode < 0x100) {
                newBufView[j++] = dbcsCode;
            }
            else if (dbcsCode < 0x10000) {
                newBufView[j++] = dbcsCode >> 8;
                newBufView[j++] = dbcsCode & 0xFF;
            }
            else {
                newBufView[j++] = dbcsCode >> 16;
                newBufView[j++] = (dbcsCode >> 8) & 0xFF;
                newBufView[j++] = dbcsCode & 0xFF;
            }
        }
        this.seqObj = seqObj;
        this.leadSurrogate = leadSurrogate;
        return newBuf.slice(0, j);
    };
    DBCSEncoder.prototype.end = function () {
        if (this.leadSurrogate === -1 && this.seqObj === undefined)
            return;
        var newBuf = new ArrayBuffer(10), j = 0;
        var newBufV = new Uint8Array(newBuf);
        if (this.seqObj) {
            var dbcsCode = this.seqObj[DEF_CHAR];
            if (dbcsCode !== undefined) {
                if (dbcsCode < 0x100) {
                    newBufV[j++] = dbcsCode;
                }
                else {
                    newBufV[j++] = dbcsCode >> 8;
                    newBufV[j++] = dbcsCode & 0xFF;
                }
            }
            else {
            }
            this.seqObj = undefined;
        }
        if (this.leadSurrogate !== -1) {
            newBufV[j++] = this.defaultCharSingleByte;
            this.leadSurrogate = -1;
        }
        return newBuf.slice(0, j);
    };
    DBCSEncoder.prototype.findIdx = function (table, val) {
        if (table[0] > val)
            return -1;
        var l = 0, r = table.length;
        while (l < r - 1) {
            var mid = l + Math.floor((r - l + 1) / 2);
            if (table[mid] <= val)
                l = mid;
            else
                r = mid;
        }
        return l;
    };
    return DBCSEncoder;
}());
var DBCSDecoder = (function () {
    function DBCSDecoder(options, codec) {
        this.nodeIdx = 0;
        this.prevBuf = new ArrayBuffer(0);
        this.decodeTables = codec.decodeTables;
        this.decodeTableSeq = codec.decodeTableSeq;
        this.defaultCharUnicode = codec.defaultCharUnicode;
        this.gb18030 = codec.gb18030;
    }
    DBCSDecoder.prototype.write = function (buf) {
        var newBuf = new ArrayBuffer(buf.byteLength * 2), newBufView = new Uint8Array(newBuf), bufView = new Uint8Array(buf), prevBufView, nodeIdx = this.nodeIdx, prevBuf = this.prevBuf, prevBufOffset = this.prevBuf.byteLength, seqStart = -this.prevBuf.byteLength, uCode, j = 0;
        if (prevBufOffset > 0)
            prevBuf = util_1.concatBuf([prevBuf, buf.slice(0, 10)]);
        prevBufView = new Uint8Array(prevBuf);
        for (var i = 0; i < bufView.length; i++) {
            var curByte = (i >= 0) ? bufView[i] : prevBufView[i + prevBufOffset];
            uCode = this.decodeTables[nodeIdx][curByte];
            if (uCode >= 0) {
            }
            else if (uCode === UNASSIGNED) {
                i = seqStart;
                uCode = this.defaultCharUnicode.charCodeAt(0);
            }
            else if (uCode === GB18030_CODE) {
                var curSeq = (seqStart >= 0) ? buf.slice(seqStart, i + 1) : prevBuf.slice(seqStart + prevBufOffset, i + 1 + prevBufOffset);
                var curSeqView = new Uint8Array(curSeq);
                var ptr = (curSeqView[0] - 0x81) * 12600 + (curSeqView[1] - 0x30) * 1260 + (curSeqView[2] - 0x81) * 10 + (curSeqView[3] - 0x30);
                var idx = util_1.findIdx(this.gb18030.gbChars, ptr);
                uCode = this.gb18030.uChars[idx] + ptr - this.gb18030.gbChars[idx];
            }
            else if (uCode <= NODE_START) {
                nodeIdx = NODE_START - uCode;
                continue;
            }
            else if (uCode <= SEQ_START) {
                var seq = this.decodeTableSeq[SEQ_START - uCode];
                for (var k = 0; k < seq.length - 1; k++) {
                    uCode = seq[k];
                    newBufView[j++] = uCode & 0xFF;
                    newBufView[j++] = uCode >> 8;
                }
                uCode = seq[seq.length - 1];
            }
            else
                throw new Error("iconv-lite internal error: invalid decoding table value " + uCode + " at " + nodeIdx + "/" + curByte);
            if (uCode > 0xFFFF) {
                uCode -= 0x10000;
                var uCodeLead = 0xD800 + Math.floor(uCode / 0x400);
                newBufView[j++] = uCodeLead & 0xFF;
                newBufView[j++] = uCodeLead >> 8;
                uCode = 0xDC00 + uCode % 0x400;
            }
            newBufView[j++] = uCode & 0xFF;
            newBufView[j++] = uCode >> 8;
            nodeIdx = 0;
            seqStart = i + 1;
        }
        this.nodeIdx = nodeIdx;
        this.prevBuf = (seqStart >= 0) ? buf.slice(seqStart) : prevBuf.slice(seqStart + prevBufOffset);
        return util_1.bufToStr(newBuf.slice(0, j));
    };
    DBCSDecoder.prototype.end = function () {
        var ret = '';
        while (this.prevBuf.byteLength > 0) {
            ret += this.defaultCharUnicode;
            var buf = this.prevBuf.slice(1);
            this.prevBuf = new ArrayBuffer(0);
            this.nodeIdx = 0;
            if (buf.byteLength > 0)
                ret += this.write(buf);
        }
        this.nodeIdx = 0;
        return ret;
    };
    return DBCSDecoder;
}());
//# sourceMappingURL=dbcs-codec.js.map