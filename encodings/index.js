"use strict";
exports.__esModule = true;
var dbcsData = require("./dbcs-data");
var DBCSCodec = require("./dbcs-codec");
var modules = [
    DBCSCodec,
    dbcsData,
];
exports.encodings = {};
for (var i = 0; i < modules.length; i++) {
    var module = modules[i];
    for (var enc in module) {
        if (Object.prototype.hasOwnProperty.call(module, enc)) {
            if (typeof module[enc] === 'object') {
                for (var item in module[enc]) {
                    if (Object.prototype.hasOwnProperty.call(module[enc], item)) {
                        exports.encodings[item] = module[enc][item];
                    }
                }
            }
            else {
                exports.encodings[enc] = module[enc];
            }
        }
    }
}
//# sourceMappingURL=index.js.map