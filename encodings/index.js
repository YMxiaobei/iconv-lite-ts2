"use strict";
exports.__esModule = true;
var dbcsData = require("./dbcs-data");
var DBCSCodec = require("./dbcs-codec");
// Update this array if you add/rename/remove files in this directory.
// We support Browserify by skipping automatic module discovery and requiring modules directly.
var modules = [
    //require("./internal"),
    //require("./utf16"),
    //require("./utf7"),
    //require("./sbcs-codec"),
    //require("./sbcs-data"),
    //require("./sbcs-data-generated"),
    DBCSCodec,
    dbcsData,
];
exports.encodings = {};
// Put all encoding/alias/codec definitions to single object and export it. 
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
