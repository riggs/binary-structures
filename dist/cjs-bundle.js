'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('improved-map');

const hex = (value) => {
    return "0x" + value.toString(16).toUpperCase().padStart(2, "0");
};
const hex_buffer = (buffer) => {
    return Array.from(new Uint8Array(buffer), hex).join(", ");
};
const utf8_encoder = new TextEncoder();
const utf8_decoder = new TextDecoder();
const Bits_Sizes = [1, 2, 3, 4, 5, 6, 7];
const Uint_Sizes = Bits_Sizes.concat([8, 16, 32, 64]);
const Int_Sizes = [8, 16, 32];
const Float_Sizes = [32, 64];
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
const utf8_parse = ({ bits, data_view, byte_offset = 0 }) => {
    if (byte_offset % 1) {
        return read_bit_shift(utf8_parse, { bits, data_view, byte_offset });
    }
    else {
        return utf8_decoder.decode(new DataView(data_view.buffer, byte_offset, bits ? bits / 8 : undefined));
    }
};

const Parent = '$parent';
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
const inspect = {
    encode: inspect_transcoder,
    decode: inspect_transcoder,
};
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
const Bits = factory(uint_pack, uint_parse, (s) => Bits_Sizes.includes(s));
const Uint = factory(uint_pack, uint_parse, (s) => Uint_Sizes.includes(s));
const Int = factory(int_pack, int_parse, (s) => Int_Sizes.includes(s));
const Float = factory(float_pack, float_parse, (s) => Float_Sizes.includes(s));
const Utf8 = factory(utf8_pack, utf8_parse, (s) => s % 8 === 0 && s >= 0);
const numeric = (n, context, type = 'B') => {
    if (typeof n === 'object') {
        let { bits = 0, bytes = 0 } = n;
        n = type === 'B' ? bits / 8 + bytes : bits + bytes * 8;
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
const Padding = (bits, transcoders = {}) => {
    const { encode, decode } = transcoders;
    const pack = (source, options = {}) => {
        let { data_view, byte_offset = 0, context } = options;
        const size = numeric(bits, context, 'b');
        if (data_view === undefined) {
            data_view = new DataView(new ArrayBuffer(Math.ceil(size / 8)));
        }
        if (encode !== undefined) {
            let fill = encode(null, options.context);
            let i = 0;
            while (i < Math.floor(size / 8)) {
                data_view.setUint8(byte_offset + i, fill);
                fill >>= 8;
                i++;
            }
            const remainder = size % 8;
            if (remainder) {
                data_view.setUint8(byte_offset + i, fill & (2 ** remainder - 1));
            }
        }
        return { size: size / 8, buffer: data_view.buffer };
    };
    const parse = (data_view, options = {}, deliver) => {
        const { context } = options;
        const size = numeric(bits, context, 'b');
        let data = null;
        if (decode !== undefined) {
            data = decode(data, context);
            if (deliver !== undefined) {
                deliver(data);
            }
        }
        return { size: size / 8, data };
    };
    return { pack, parse };
};
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
const Embed = (embedded) => {
    const pack = (source, { byte_offset, data_view, little_endian, context } = {}) => {
        if (context !== undefined) {
            const parent = context[Parent];
            if (embedded instanceof Array) {
                return embedded
                    .pack(context, { byte_offset, data_view, little_endian, context: parent }, source);
            }
            else if (embedded instanceof Map) {
                return embedded
                    .pack(context, { byte_offset, data_view, little_endian, context: parent }, context);
            }
        }
        return embedded.pack(source, { byte_offset, data_view, little_endian, context });
    };
    const parse = (data_view, { byte_offset, little_endian, context } = {}, deliver) => {
        if (context !== undefined) {
            const parent = context[Parent];
            if (embedded instanceof Array) {
                return embedded
                    .parse(data_view, { byte_offset, little_endian, context: parent }, undefined, context);
            }
            else if (embedded instanceof Map) {
                return embedded
                    .parse(data_view, { byte_offset, little_endian, context: parent }, undefined, context);
            }
        }
        return embedded.parse(data_view, { byte_offset, little_endian, context }, deliver);
    };
    return { pack, parse };
};
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
function exports.Binary_Map(transcoders = {}, iterable) {
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
}
(function (Binary_Map) {
    Binary_Map.object_encoder = (obj) => Map.fromObject(obj);
    Binary_Map.object_decoder = (map) => map.toObject();
    Binary_Map.object_transcoders = { encode: Binary_Map.object_encoder, decode: Binary_Map.object_decoder };
})(exports.Binary_Map || (exports.Binary_Map = {}));
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

const Uint8 = Uint(8);
const Uint16 = Uint(16);
const Uint16LE = Uint(16, { little_endian: true });
const Uint16BE = Uint16;
const Uint32 = Uint(32);
const Uint32LE = Uint(32, { little_endian: true });
const Uint32BE = Uint32;
const Uint64 = Uint(64);
const Uint64LE = Uint(64, { little_endian: true });
const Uint64BE = Uint64;
const Int8 = Int(8);
const Int16 = Int(8);
const Int16LE = Int(16, { little_endian: true });
const Int16BE = Int16;
const Int32 = Int(32);
const Int32LE = Int(32, { little_endian: true });
const Int32BE = Int32;
const Float32 = Float(32);
const Float32LE = Float(32, { little_endian: true });
const Float32BE = Float32;
const Float64 = Float(64);
const Float64LE = Float(64, { little_endian: true });
const Float64BE = Float64;
/** Noöp structure
 *
 * @type {Struct}
 */
const Pass = Padding(0);

exports.Uint8 = Uint8;
exports.Uint16 = Uint16;
exports.Uint16LE = Uint16LE;
exports.Uint16BE = Uint16BE;
exports.Uint32 = Uint32;
exports.Uint32LE = Uint32LE;
exports.Uint32BE = Uint32BE;
exports.Uint64 = Uint64;
exports.Uint64LE = Uint64LE;
exports.Uint64BE = Uint64BE;
exports.Int8 = Int8;
exports.Int16 = Int16;
exports.Int16LE = Int16LE;
exports.Int16BE = Int16BE;
exports.Int32 = Int32;
exports.Int32LE = Int32LE;
exports.Int32BE = Int32BE;
exports.Float32 = Float32;
exports.Float32LE = Float32LE;
exports.Float32BE = Float32BE;
exports.Float64 = Float64;
exports.Float64LE = Float64LE;
exports.Float64BE = Float64BE;
exports.Pass = Pass;
exports.hex = hex;
exports.hex_buffer = hex_buffer;
exports.inspect = inspect;
exports.Parent = Parent;
exports.Bits = Bits;
exports.Uint = Uint;
exports.Int = Int;
exports.Float = Float;
exports.Utf8 = Utf8;
exports.Embed = Embed;
exports.Binary_Array = Binary_Array;
exports.Byte_Buffer = Byte_Buffer;
exports.Repeat = Repeat;
exports.Branch = Branch;
exports.Padding = Padding;
//# sourceMappingURL=cjs-bundle.js.map
