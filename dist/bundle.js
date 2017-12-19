/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["g"] = hex;
/* harmony export (immutable) */ __webpack_exports__["h"] = hex_buffer;
function hex(value) {
    return "0x" + value.toString(16).toUpperCase().padStart(2, "0");
}
function hex_buffer(buffer) {
    return Array.from(new Uint8Array(buffer), hex).join(", ");
}
const utf8_encoder = new TextEncoder();
const utf8_decoder = new TextDecoder();
const Bits_Sizes = [1, 2, 3, 4, 5, 6, 7];
/* harmony export (immutable) */ __webpack_exports__["a"] = Bits_Sizes;

const Uint_Sizes = Bits_Sizes.concat([8, 16, 32, 64]);
/* harmony export (immutable) */ __webpack_exports__["d"] = Uint_Sizes;

const Int_Sizes = [8, 16, 32];
/* harmony export (immutable) */ __webpack_exports__["c"] = Int_Sizes;

const Float_Sizes = [32, 64];
/* harmony export (immutable) */ __webpack_exports__["b"] = Float_Sizes;

const write_bit_shift = (packer, value, { bits, data_view, byte_offset = 0, little_endian }) => {
    /*
     bit_offset = 5
     buffer = 00011111
     byte = xxxxxxxx

     new_buffer = 000xxxxx xxx11111
     */
    const bit_offset = (byte_offset % 1) * 8;
    byte_offset = Math.floor(byte_offset);
    const bytes = new Uint8Array(Math.ceil(bits / 8));
    const bit_length = packer(value, { bits, byte_offset: 0, data_view: new DataView(bytes.buffer), little_endian });
    let overlap = data_view.getUint8(byte_offset) & (0xFF >> (8 - bit_offset));
    for (const [index, byte] of bytes.entries()) {
        data_view.setUint8(byte_offset + index, ((byte << bit_offset) & 0xFF) | overlap);
        overlap = byte >> (8 - bit_offset);
    }
    if (bit_offset + bits > 8) {
        data_view.setUint8(byte_offset + Math.ceil(bits / 8), overlap);
    }
    return bit_length;
};
const read_bit_shift = (parser, { bits, data_view, byte_offset = 0, little_endian }) => {
    const bit_offset = (byte_offset % 1) * 8;
    byte_offset = Math.floor(byte_offset);
    const bytes = new Uint8Array(Math.ceil(bits / 8));
    let byte = data_view.getUint8(byte_offset);
    if (bit_offset + bits > 8) {
        for (const index of bytes.keys()) {
            const next = data_view.getUint8(byte_offset + index + 1);
            bytes[index] = (byte >> bit_offset) | ((next << (8 - bit_offset)) & (0xFF >> (bits < 8 ? (8 - bits) : 0)));
            byte = next;
        }
    }
    else {
        bytes[0] = byte >> bit_offset & (0xFF >> (8 - bits));
    }
    return parser({ bits, byte_offset: 0, data_view: new DataView(bytes.buffer), little_endian });
};
const uint_pack = (value, { bits, data_view, byte_offset = 0, little_endian }) => {
    const original_value = value;
    value = Math.floor(original_value);
    if (value < 0 || value > 2 ** bits || original_value !== value || value > Number.MAX_SAFE_INTEGER) {
        throw new Error(`Unable to encode ${original_value} to Uint${bits}`);
    }
    if (byte_offset % 1) {
        return write_bit_shift(uint_pack, value, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
                data_view.setUint8(byte_offset, value);
                break;
            case 16:
                data_view.setUint16(byte_offset, value, little_endian);
                break;
            case 32:
                data_view.setUint32(byte_offset, value, little_endian);
                break;
            case 64:/* Special case to handle millisecond epoc time (from Date.now()) */ 
                const upper = Math.floor(value / 2 ** 32);
                const lower = value % 2 ** 32;
                let low_byte;
                let high_byte;
                if (little_endian) {
                    low_byte = lower;
                    high_byte = upper;
                }
                else {
                    low_byte = upper;
                    high_byte = lower;
                }
                data_view.setUint32(byte_offset, low_byte, little_endian);
                data_view.setUint32(byte_offset + 4, high_byte, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};
/* harmony export (immutable) */ __webpack_exports__["k"] = uint_pack;

const uint_parse = ({ bits, data_view, byte_offset = 0, little_endian }) => {
    if (byte_offset % 1) {
        return read_bit_shift(uint_parse, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                return data_view.getUint8(byte_offset) & (0xFF >> (8 - bits));
            case 8:
                return data_view.getUint8(byte_offset);
            case 16:
                return data_view.getUint16(byte_offset, little_endian);
            case 32:
                return data_view.getUint32(byte_offset, little_endian);
            case 64:/* Special case to handle millisecond epoc time (from Date.now()) */ 
                const low_byte = data_view.getUint32(byte_offset, little_endian);
                const high_byte = data_view.getUint32(byte_offset + 4, little_endian);
                let value;
                if (little_endian) {
                    value = high_byte * 2 ** 32 + low_byte;
                }
                else {
                    value = low_byte * 2 ** 32 + high_byte;
                }
                if (value > Number.MAX_SAFE_INTEGER) {
                    throw new Error(`Uint64 out of range for Javascript: ${hex_buffer(data_view.buffer.slice(byte_offset, byte_offset + 8))}`);
                }
                return value;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
    }
};
/* harmony export (immutable) */ __webpack_exports__["l"] = uint_parse;

const int_pack = (value, { bits, data_view, byte_offset = 0, little_endian }) => {
    const original_value = value;
    value = Math.floor(original_value);
    if (value < -(2 ** (bits - 1)) || value > 2 ** (bits - 1) - 1 || original_value !== value) {
        throw new Error(`Unable to encode ${original_value} to Int${bits}`);
    }
    if (byte_offset % 1) {
        return write_bit_shift(int_pack, value, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 8:
                data_view.setUint8(byte_offset, value);
                break;
            case 16:
                data_view.setUint16(byte_offset, value, little_endian);
                break;
            case 32:
                data_view.setUint32(byte_offset, value, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};
/* harmony export (immutable) */ __webpack_exports__["i"] = int_pack;

const int_parse = ({ bits, data_view, byte_offset = 0, little_endian }) => {
    if (byte_offset % 1) {
        return read_bit_shift(int_parse, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 8:
                return data_view.getInt8(byte_offset);
            case 16:
                return data_view.getInt16(byte_offset, little_endian);
            case 32:
                return data_view.getInt32(byte_offset, little_endian);
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
    }
};
/* harmony export (immutable) */ __webpack_exports__["j"] = int_parse;

const float_pack = (value, { bits, data_view, byte_offset = 0, little_endian }) => {
    /* TODO: Input validation */
    if (byte_offset % 1) {
        return write_bit_shift(float_pack, value, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 32:
                data_view.setFloat32(byte_offset, value, little_endian);
                break;
            case 64:
                data_view.setFloat64(byte_offset, value, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};
/* harmony export (immutable) */ __webpack_exports__["e"] = float_pack;

const float_parse = ({ bits, data_view, byte_offset = 0, little_endian }) => {
    if (byte_offset % 1) {
        return read_bit_shift(float_parse, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 32:
                return data_view.getFloat32(byte_offset, little_endian);
            case 64:
                return data_view.getFloat64(byte_offset, little_endian);
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
    }
};
/* harmony export (immutable) */ __webpack_exports__["f"] = float_parse;

const utf8_pack = (value, { bits, data_view, byte_offset = 0 }) => {
    if (byte_offset % 1) {
        return write_bit_shift(utf8_pack, value, { bits, data_view, byte_offset });
    }
    else {
        const byte_array = utf8_encoder.encode(value);
        const byte_length = byte_array.byteLength;
        if (bits > 0 && byte_length > bits / 8) {
            throw new Error(`Input string serializes to longer than ${bits / 8} bytes:\n${value}`);
        }
        if (byte_length + byte_offset > data_view.byteLength) {
            throw new Error(`Insufficient space in ArrayBuffer to store length ${byte_length} string:\n${value}`);
        }
        for (const [index, byte] of byte_array.entries()) {
            data_view.setUint8(byte_offset + index, byte);
        }
        return byte_length * 8;
    }
};
/* harmony export (immutable) */ __webpack_exports__["m"] = utf8_pack;

const utf8_parse = ({ bits, data_view, byte_offset = 0 }) => {
    if (byte_offset % 1) {
        return read_bit_shift(utf8_parse, { bits, data_view, byte_offset });
    }
    else {
        return utf8_decoder.decode(new DataView(data_view.buffer, byte_offset, bits ? bits / 8 : undefined));
    }
};
/* harmony export (immutable) */ __webpack_exports__["n"] = utf8_parse;



/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__serialization__ = __webpack_require__(0);

const Parent = '$parent';
/* harmony export (immutable) */ __webpack_exports__["j"] = Parent;

const set_context = (data, context) => {
    if (context !== undefined) {
        data[Parent] = context;
    }
    return data;
};
const remove_context = (data, delete_flag) => {
    if (delete_flag) {
        delete data[Parent];
    }
    return data;
};
const inspect_transcoder = (data, context) => {
    console.log({ data, context });
    return data;
};
/* unused harmony export inspect_transcoder */

const inspect = {
    encode: inspect_transcoder,
    decode: inspect_transcoder,
};
/* harmony export (immutable) */ __webpack_exports__["n"] = inspect;

const fetch_and_encode = ({ source, encode, context }) => {
    let decoded;
    if (typeof source === 'function') {
        decoded = source();
    }
    else {
        decoded = source;
    }
    if (typeof encode === 'function') {
        return encode(decoded, context);
    }
    else {
        return decoded;
    }
};
const decode_and_deliver = ({ encoded, decode, context, deliver }) => {
    let decoded;
    if (typeof decode === 'function') {
        decoded = decode(encoded, context);
    }
    else {
        decoded = encoded;
    }
    if (typeof deliver === 'function') {
        deliver(decoded);
    }
    return decoded;
};
const factory = (serializer, deserializer, verify_size) => {
    return ((bits, transcoders = {}) => {
        if (!verify_size(bits)) {
            throw new Error(`Invalid size: ${bits}`);
        }
        const { encode, decode, little_endian: LE } = transcoders;
        const pack = (source, options = {}) => {
            const { data_view = new DataView(new ArrayBuffer(Math.ceil(bits / 8))), byte_offset = 0, little_endian = LE, context } = options;
            const encoded = fetch_and_encode({ source, encode, context });
            const size = (serializer(encoded, { bits, data_view, byte_offset, little_endian }) / 8);
            return { size, buffer: data_view.buffer };
        };
        const parse = (data_view, options = {}, deliver) => {
            const { byte_offset = 0, little_endian = LE, context } = options;
            const encoded = deserializer({ bits, data_view, byte_offset, little_endian });
            const data = decode_and_deliver({ encoded, context, decode, deliver });
            return { data, size: bits / 8 };
        };
        return { pack, parse };
    });
};
const Bits = factory(__WEBPACK_IMPORTED_MODULE_0__serialization__["k" /* uint_pack */], __WEBPACK_IMPORTED_MODULE_0__serialization__["l" /* uint_parse */], (s) => __WEBPACK_IMPORTED_MODULE_0__serialization__["a" /* Bits_Sizes */].includes(s));
/* harmony export (immutable) */ __webpack_exports__["c"] = Bits;

const Uint = factory(__WEBPACK_IMPORTED_MODULE_0__serialization__["k" /* uint_pack */], __WEBPACK_IMPORTED_MODULE_0__serialization__["l" /* uint_parse */], (s) => __WEBPACK_IMPORTED_MODULE_0__serialization__["d" /* Uint_Sizes */].includes(s));
/* harmony export (immutable) */ __webpack_exports__["l"] = Uint;

const Int = factory(__WEBPACK_IMPORTED_MODULE_0__serialization__["i" /* int_pack */], __WEBPACK_IMPORTED_MODULE_0__serialization__["j" /* int_parse */], (s) => __WEBPACK_IMPORTED_MODULE_0__serialization__["c" /* Int_Sizes */].includes(s));
/* harmony export (immutable) */ __webpack_exports__["h"] = Int;

const Float = factory(__WEBPACK_IMPORTED_MODULE_0__serialization__["e" /* float_pack */], __WEBPACK_IMPORTED_MODULE_0__serialization__["f" /* float_parse */], (s) => __WEBPACK_IMPORTED_MODULE_0__serialization__["b" /* Float_Sizes */].includes(s));
/* harmony export (immutable) */ __webpack_exports__["g"] = Float;

const Utf8 = factory(__WEBPACK_IMPORTED_MODULE_0__serialization__["m" /* utf8_pack */], __WEBPACK_IMPORTED_MODULE_0__serialization__["n" /* utf8_parse */], (s) => s % 8 === 0 && s >= 0);
/* harmony export (immutable) */ __webpack_exports__["m"] = Utf8;

const numeric = (n, context) => {
    if (typeof n === 'object') {
        let { bits = 0, bytes = 0 } = n;
        n = bits / 8 + bytes;
    }
    else if (typeof n === 'function') {
        n = n(context);
    }
    else if (typeof n !== 'number') {
        throw new Error(`Invalid numeric input ${n}`);
    }
    if (n < 0) {
        throw new Error(`Invalid size: ${n} bytes`);
    }
    return n;
};
/** Byte_Buffer doesn't do any serialization, but just copies bytes to/from an ArrayBuffer that's a subset of the
 * serialized buffer. Byte_Buffer only works on byte-aligned data.
 *
 * @param {Numeric} length
 * @param {Transcoders<ArrayBuffer, any>} transcoders
 */
const Byte_Buffer = (length, transcoders = {}) => {
    const { encode, decode } = transcoders;
    const pack = (source, options = {}) => {
        const { data_view, byte_offset = 0, context } = options;
        const size = numeric(length, context);
        const buffer = fetch_and_encode({ source, encode, context });
        if (size !== buffer.byteLength) {
            throw new Error(`Length miss-match. Expected length: ${size}, actual bytelength: ${buffer.byteLength}`);
        }
        if (data_view === undefined) {
            return { size, buffer };
        }
        new Uint8Array(buffer).forEach((value, index) => {
            data_view.setUint8(byte_offset + index, value);
        });
        return { size, buffer: data_view.buffer };
    };
    const parse = (data_view, options = {}, deliver) => {
        const { byte_offset = 0, context } = options;
        const size = numeric(length, context);
        const buffer = data_view.buffer.slice(byte_offset, byte_offset + size);
        const data = decode_and_deliver({ encoded: buffer, context, decode, deliver });
        return { data, size };
    };
    return { pack, parse };
};
/* harmony export (immutable) */ __webpack_exports__["e"] = Byte_Buffer;

const Padding = (size) => {
    const pack = (source, options = {}) => {
        size = numeric(size, options.context);
        return { size, buffer: options.data_view === undefined ? new ArrayBuffer(Math.ceil(size)) : options.data_view.buffer };
    };
    const parse = (data_view, options = {}, deliver) => {
        size = numeric(size, options.context);
        return { size, data: null };
    };
    return { pack, parse };
};
/* harmony export (immutable) */ __webpack_exports__["i"] = Padding;

const Branch = ({ chooser, choices, default_choice }) => {
    const choose = (source) => {
        let choice = chooser(source);
        if (choices.hasOwnProperty(choice)) {
            return choices[choice];
        }
        else {
            if (default_choice !== undefined) {
                return default_choice;
            }
            else {
                throw new Error(`Choice ${choice} not in ${Object.keys(choices)}`);
            }
        }
    };
    const pack = (source, options = {}) => {
        return choose(options.context).pack(source, options);
    };
    const parse = (data_view, options = {}, deliver) => {
        return choose(options.context).parse(data_view, options, deliver);
    };
    return { parse, pack };
};
/* harmony export (immutable) */ __webpack_exports__["d"] = Branch;

const Embed = (embedded) => {
    const pack = (source, options = {}) => {
        if (options.context !== undefined) {
            const { context } = options;
            options.context = context[Parent];
            if (embedded instanceof Array) {
                return embedded.pack(context, options, source);
            }
            else if (embedded instanceof Map) {
                return embedded.pack(context, options, context);
            }
        }
        return embedded.pack(source, options);
    };
    const parse = (data_view, options = {}, deliver) => {
        if (options.context !== undefined) {
            const { context } = options;
            options.context = context[Parent];
            if (embedded instanceof Array) {
                return embedded.parse(data_view, options, undefined, context);
            }
            else if (embedded instanceof Map) {
                return embedded.parse(data_view, options, undefined, context);
            }
        }
        return embedded.parse(data_view, options, deliver);
    };
    return { pack, parse };
};
/* harmony export (immutable) */ __webpack_exports__["f"] = Embed;

const Binary_Map = (transcoders = {}, iterable) => {
    if (transcoders instanceof Array) {
        [transcoders, iterable] = [iterable, transcoders];
    }
    const { encode, decode, little_endian: LE } = transcoders;
    const map = new Map((iterable || []));
    map.pack = (source, options = {}, encoded) => {
        const packed = [];
        let { data_view, byte_offset = 0, little_endian = LE, context } = options;
        if (encoded === undefined) {
            encoded = fetch_and_encode({ source, encode, context });
            set_context(encoded, context);
        }
        /* Need to return a function to the `pack` chain to enable Embed with value checking. */
        const fetcher = (key) => () => {
            const value = encoded.get(key);
            if (value === undefined) {
                throw new Error(`Insufficient data for serialization: ${key} not in ${encoded}`);
            }
            return value;
        };
        let offset = 0;
        for (const [key, item] of map) {
            const { size, buffer } = item.pack(fetcher(key), { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context: encoded });
            if (data_view === undefined) {
                packed.push({ size, buffer });
            }
            offset += size;
        }
        if (data_view === undefined) {
            data_view = concat_buffers(packed, offset);
        }
        return { size: offset, buffer: data_view.buffer };
    };
    map.parse = (data_view, options = {}, deliver, results) => {
        const { byte_offset = 0, little_endian = LE, context } = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = set_context(new Map(), context);
            remove_parent_symbol = true;
        }
        let offset = 0;
        for (const [key, item] of map) {
            const { data, size } = item.parse(data_view, { byte_offset: byte_offset + offset, little_endian, context: results }, (data) => results.set(key, data));
            offset += size;
        }
        const data = decode_and_deliver({ encoded: results, decode, context, deliver });
        remove_context(results, remove_parent_symbol);
        return { data, size: offset };
    };
    return map;
};
/* harmony export (immutable) */ __webpack_exports__["b"] = Binary_Map;

const concat_buffers = (packed, byte_length) => {
    const data_view = new DataView(new ArrayBuffer(Math.ceil(byte_length)));
    let byte_offset = 0;
    for (const { size, buffer } of packed) {
        /* Copy all the data from the returned buffers into one grand buffer. */
        const bytes = Array.from(new Uint8Array(buffer));
        /* Create a Byte Array with the appropriate number of Uint(8)s, possibly with a trailing Bits. */
        const array = Binary_Array();
        for (let i = 0; i < Math.floor(size); i++) {
            array.push(Uint(8));
        }
        if (size % 1) {
            array.push(Bits((size % 1) * 8));
        }
        /* Pack the bytes into the buffer */
        array.pack(bytes, { data_view, byte_offset });
        byte_offset += size;
    }
    return data_view;
};
/* This would be much cleaner if JavaScript had interfaces. Or I could make everything subclass Struct... */
const extract_array_options = (elements = []) => {
    if (elements.length > 0) {
        const first = elements[0];
        if (!first.hasOwnProperty('pack') && !first.hasOwnProperty('parse')) {
            return elements.shift();
        }
        const last = elements[elements.length - 1];
        if (!last.hasOwnProperty('pack') && !last.hasOwnProperty('parse')) {
            return elements.pop();
        }
    }
    return {};
};
const Binary_Array = (...elements) => {
    const { encode, decode, little_endian: LE } = extract_array_options(elements);
    const array = new Array(...elements);
    array.pack = (source, options = {}, fetcher) => {
        let { data_view, byte_offset = 0, little_endian = LE, context } = options;
        const encoded = fetch_and_encode({ source, encode, context });
        const packed = [];
        if (fetcher === undefined) {
            set_context(encoded, context);
            const iterator = encoded[Symbol.iterator]();
            fetcher = () => {
                const value = iterator.next().value;
                if (value === undefined) {
                    throw new Error(`Insufficient data for serialization: ${encoded}`);
                }
                return value;
            };
        }
        const store = (result) => {
            if (data_view === undefined) {
                packed.push(result);
            }
        };
        const size = array.__pack_loop(fetcher, { data_view, byte_offset, little_endian, context: encoded }, store, context);
        if (data_view === undefined) {
            data_view = concat_buffers(packed, size);
        }
        return { size, buffer: data_view.buffer };
    };
    array.__pack_loop = (fetcher, { data_view, byte_offset = 0, little_endian, context }, store) => {
        let offset = 0;
        for (const item of array) {
            const { size, buffer } = item.pack(fetcher, { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context });
            store({ size, buffer });
            offset += size;
        }
        return offset;
    };
    array.parse = (data_view, options = {}, deliver, results) => {
        const { byte_offset = 0, little_endian = LE, context } = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = set_context(new Array(), context);
            remove_parent_symbol = true;
        }
        const size = array.__parse_loop(data_view, { byte_offset, little_endian, context: results }, (data) => results.push(data), context);
        const data = decode_and_deliver({ encoded: remove_context(results, remove_parent_symbol), context, decode, deliver });
        return { data, size };
    };
    array.__parse_loop = (data_view, { byte_offset = 0, little_endian, context }, deliver) => {
        let offset = 0;
        for (const item of array) {
            const { data, size } = item.parse(data_view, { byte_offset: byte_offset + offset, little_endian, context }, deliver);
            offset += size;
        }
        return offset;
    };
    return array;
};
/* harmony export (immutable) */ __webpack_exports__["a"] = Binary_Array;

const Repeat = (...elements) => {
    const { count, bytes, encode, decode, little_endian } = extract_array_options(elements);
    const array = Binary_Array({ encode, decode, little_endian }, ...elements);
    const pack_loop = array.__pack_loop;
    const parse_loop = array.__parse_loop;
    array.__pack_loop = (fetcher, { data_view, byte_offset = 0, little_endian, context }, store, parent) => {
        let offset = 0;
        if (count !== undefined) {
            const repeat = numeric(count, parent);
            for (let i = 0; i < repeat; i++) {
                offset += pack_loop(fetcher, { data_view, byte_offset: byte_offset + offset, little_endian, context }, store);
            }
        }
        else if (bytes !== undefined) {
            const repeat = numeric(bytes, parent);
            while (offset < repeat) {
                offset += pack_loop(fetcher, { data_view, byte_offset: byte_offset + offset, little_endian, context }, store);
            }
            if (offset > repeat) {
                throw new Error(`Cannot pack into ${repeat} bytes.`);
            }
        }
        else {
            throw new Error("One of count or bytes must specified in options.");
        }
        return offset;
    };
    array.__parse_loop = (data_view, { byte_offset = 0, little_endian, context }, deliver, parent) => {
        let offset = 0;
        if (count !== undefined) {
            const repeat = numeric(count, parent);
            for (let i = 0; i < repeat; i++) {
                offset += parse_loop(data_view, { byte_offset: byte_offset + offset, little_endian, context }, deliver);
            }
        }
        else if (bytes !== undefined) {
            const repeat = numeric(bytes, parent);
            while (offset < repeat) {
                offset += parse_loop(data_view, { byte_offset: byte_offset + offset, little_endian, context }, deliver);
            }
            if (offset > repeat) {
                throw new Error(`Cannot parse exactly ${repeat} bytes.`);
            }
        }
        else {
            throw new Error("One of count or bytes must specified in options.");
        }
        return offset;
    };
    return array;
};
/* harmony export (immutable) */ __webpack_exports__["k"] = Repeat;



/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__serialization__ = __webpack_require__(0);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "hex", function() { return __WEBPACK_IMPORTED_MODULE_0__serialization__["g"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "hex_buffer", function() { return __WEBPACK_IMPORTED_MODULE_0__serialization__["h"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__transcode__ = __webpack_require__(1);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "inspect", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["n"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Parent", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["j"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Bits", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["c"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Uint", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["l"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Int", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["h"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Float", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["g"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Utf8", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["m"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Embed", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["f"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Binary_Array", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Binary_Map", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Byte_Buffer", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["e"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Repeat", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["k"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Branch", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["d"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "Padding", function() { return __WEBPACK_IMPORTED_MODULE_1__transcode__["i"]; });



const Uint8 = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["l" /* Uint */])(8);
/* harmony export (immutable) */ __webpack_exports__["Uint8"] = Uint8;

const Uint16 = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["l" /* Uint */])(16);
/* harmony export (immutable) */ __webpack_exports__["Uint16"] = Uint16;

const Uint16LE = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["l" /* Uint */])(16, { little_endian: true });
/* harmony export (immutable) */ __webpack_exports__["Uint16LE"] = Uint16LE;

const Uint16BE = Uint16;
/* harmony export (immutable) */ __webpack_exports__["Uint16BE"] = Uint16BE;

const Uint32 = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["l" /* Uint */])(32);
/* harmony export (immutable) */ __webpack_exports__["Uint32"] = Uint32;

const Uint32LE = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["l" /* Uint */])(32, { little_endian: true });
/* harmony export (immutable) */ __webpack_exports__["Uint32LE"] = Uint32LE;

const Uint32BE = Uint32;
/* harmony export (immutable) */ __webpack_exports__["Uint32BE"] = Uint32BE;

const Uint64 = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["l" /* Uint */])(64);
/* harmony export (immutable) */ __webpack_exports__["Uint64"] = Uint64;

const Uint64LE = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["l" /* Uint */])(64, { little_endian: true });
/* harmony export (immutable) */ __webpack_exports__["Uint64LE"] = Uint64LE;

const Uint64BE = Uint64;
/* harmony export (immutable) */ __webpack_exports__["Uint64BE"] = Uint64BE;

const Int8 = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["h" /* Int */])(8);
/* harmony export (immutable) */ __webpack_exports__["Int8"] = Int8;

const Int16 = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["h" /* Int */])(8);
/* harmony export (immutable) */ __webpack_exports__["Int16"] = Int16;

const Int16LE = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["h" /* Int */])(16, { little_endian: true });
/* harmony export (immutable) */ __webpack_exports__["Int16LE"] = Int16LE;

const Int16BE = Int16;
/* harmony export (immutable) */ __webpack_exports__["Int16BE"] = Int16BE;

const Int32 = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["h" /* Int */])(32);
/* harmony export (immutable) */ __webpack_exports__["Int32"] = Int32;

const Int32LE = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["h" /* Int */])(32, { little_endian: true });
/* harmony export (immutable) */ __webpack_exports__["Int32LE"] = Int32LE;

const Int32BE = Int32;
/* harmony export (immutable) */ __webpack_exports__["Int32BE"] = Int32BE;

const Float32 = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["g" /* Float */])(32);
/* harmony export (immutable) */ __webpack_exports__["Float32"] = Float32;

const Float32LE = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["g" /* Float */])(32, { little_endian: true });
/* harmony export (immutable) */ __webpack_exports__["Float32LE"] = Float32LE;

const Float32BE = Float32;
/* harmony export (immutable) */ __webpack_exports__["Float32BE"] = Float32BE;

const Float64 = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["g" /* Float */])(64);
/* harmony export (immutable) */ __webpack_exports__["Float64"] = Float64;

const Float64LE = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["g" /* Float */])(64, { little_endian: true });
/* harmony export (immutable) */ __webpack_exports__["Float64LE"] = Float64LE;

const Float64BE = Float64;
/* harmony export (immutable) */ __webpack_exports__["Float64BE"] = Float64BE;

/** Noöp structure
 *
 * @type {Struct}
 */
const Pass = Object(__WEBPACK_IMPORTED_MODULE_1__transcode__["i" /* Padding */])(0);
/* harmony export (immutable) */ __webpack_exports__["Pass"] = Pass;



/***/ })
/******/ ]);
//# sourceMappingURL=bundle.js.map