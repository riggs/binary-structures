import { Bits_Sizes, Uint_Sizes, Int_Sizes, Float_Sizes, uint_pack, int_pack, float_pack, uint_parse, int_parse, float_parse, utf8_pack, utf8_parse } from './serialization';
export const Parent = '$parent';
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
export const inspect_transcoder = (data, context) => {
    console.log({ data, context });
    return data;
};
export const inspect = {
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
export const Bits = factory(uint_pack, uint_parse, (s) => Bits_Sizes.includes(s));
export const Uint = factory(uint_pack, uint_parse, (s) => Uint_Sizes.includes(s));
export const Int = factory(int_pack, int_parse, (s) => Int_Sizes.includes(s));
export const Float = factory(float_pack, float_parse, (s) => Float_Sizes.includes(s));
export const Utf8 = factory(utf8_pack, utf8_parse, (s) => s % 8 === 0 && s >= 0);
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
export const Byte_Buffer = (length, transcoders = {}) => {
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
export const Padding = (size) => {
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
export const Branch = ({ chooser, choices, default_choice }) => {
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
export const Embed = (embedded) => {
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
export const Binary_Map = (transcoders = {}, iterable) => {
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
export const Binary_Array = (...elements) => {
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
export const Repeat = (...elements) => {
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
//# sourceMappingURL=transcode.js.map