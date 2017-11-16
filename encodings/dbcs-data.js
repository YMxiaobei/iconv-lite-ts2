"use strict";
exports.__esModule = true;
var cp936_1 = require("./tables/cp936");
var eucjp_1 = require("./tables/eucjp");
var gbk_added_1 = require("./tables/gbk-added");
var gb18030_ranges_1 = require("./tables/gb18030-ranges");
var cp949_1 = require("./tables/cp949");
var cp950_1 = require("./tables/cp950");
var big5_added_1 = require("./tables/big5-added");
exports.dbcsData = {
    'shiftjis': {
        type: 'DBCSCodec',
        table: function () { return cp936_1.cp936; },
        encodeAdd: { '\u00a5': 0x5C, '\u203E': 0x7E },
        encodeSkipVals: [{ from: 0xED40, to: 0xF940 }]
    },
    'csshiftjis': 'shiftjis',
    'mskanji': 'shiftjis',
    'sjis': 'shiftjis',
    'windows31j': 'shiftjis',
    'ms31j': 'shiftjis',
    'xsjis': 'shiftjis',
    'windows932': 'shiftjis',
    'ms932': 'shiftjis',
    '932': 'shiftjis',
    'cp932': 'shiftjis',
    'eucjp': {
        type: 'DBCSCodec',
        table: function () { return eucjp_1.eucjp; },
        encodeAdd: { '\u00a5': 0x5C, '\u203E': 0x7E }
    },
    'gb2312': 'cp936',
    'gb231280': 'cp936',
    'gb23121980': 'cp936',
    'csgb2312': 'cp936',
    'csiso58gb231280': 'cp936',
    'euccn': 'cp936',
    'windows936': 'cp936',
    'ms936': 'cp936',
    '936': 'cp936',
    'cp936': {
        type: 'DBCSCodec',
        table: function () { return cp936_1.cp936; }
    },
    'gbk': {
        type: 'DBCSCodec',
        table: function () { return cp936_1.cp936.concat(gbk_added_1.gbk_added); }
    },
    'xgbk': 'gbk',
    'isoir58': 'gbk',
    'gb18030': {
        type: 'DBCSCodec',
        table: function () { return cp936_1.cp936.concat(gbk_added_1.gbk_added); },
        gb18030: function () { return gb18030_ranges_1.gb18030_ranges; },
        encodeSkipVals: [0x80],
        encodeAdd: { '€': 0xA2E3 }
    },
    'chinese': 'gb18030',
    'windows949': 'cp949',
    'ms949': 'cp949',
    '949': 'cp949',
    'cp949': {
        type: 'DBCSCodec',
        table: function () { return cp949_1.cp949; }
    },
    'cseuckr': 'cp949',
    'csksc56011987': 'cp949',
    'euckr': 'cp949',
    'isoir149': 'cp949',
    'korean': 'cp949',
    'ksc56011987': 'cp949',
    'ksc56011989': 'cp949',
    'ksc5601': 'cp949',
    'windows950': 'cp950',
    'ms950': 'cp950',
    '950': 'cp950',
    'cp950': {
        type: 'DBCSCodec',
        table: function () { return cp950_1.cp950; }
    },
    'big5': 'big5hkscs',
    'big5hkscs': {
        type: 'DBCSCodec',
        table: function () { return cp950_1.cp950.concat(big5_added_1.big5_added); },
        encodeSkipVals: [0xa2cc]
    },
    'cnbig5': 'big5hkscs',
    'csbig5': 'big5hkscs',
    'xxbig5': 'big5hkscs'
};
//# sourceMappingURL=dbcs-data.js.map