"use strict";
import * as dbcsData from './dbcs-data';
import * as DBCSCodec from './dbcs-codec';

// Update this array if you add/rename/remove files in this directory.
// We support Browserify by skipping automatic module discovery and requiring modules directly.
let modules = [
    //require("./internal"),
    //require("./utf16"),
    //require("./utf7"),
    //require("./sbcs-codec"),
    //require("./sbcs-data"),
    //require("./sbcs-data-generated"),
    DBCSCodec,
    dbcsData,
];

export let encodings: any = {};

// Put all encoding/alias/codec definitions to single object and export it. 
for (let i = 0; i < modules.length; i++) {
    let module = modules[i];

    for (let enc in module) {
        if (Object.prototype.hasOwnProperty.call(module, enc)) {
            if ( typeof module[enc] === 'object' ) {
                for ( let item in  module[enc] ) {
                    if ( Object.prototype.hasOwnProperty.call(module[enc], item) ) {
                        encodings[item] = module[enc][item];
                    }
                }
            } else {
                encodings[enc] = module[enc];
            }
        }
    }
}
