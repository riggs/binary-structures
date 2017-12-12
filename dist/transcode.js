import { Bits_Sizes, Uint_Sizes, Int_Sizes, Float_Sizes, uint_pack, int_pack, float_pack, uint_parse, int_parse, float_parse, utf8_pack, utf8_parse } from './serialization';
/* Need to hang Context off the global Symbol because of Typescript deficiency */
Symbol.Context = Symbol.for("Context");
export const Context = Symbol.for("Context");
const set_parent = (data, parent) => {
    if (parent !== undefined) {
        data[Symbol.Context] = parent;
    }
    return data;
};
const remove_parent = (data, delete_flag) => {
    if (delete_flag) {
        delete data[Symbol.Context];
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
/* Called by pack */
const fetch_and_encode = ({ source_data, fetch, encode }) => {
    let fetched;
    if (fetch !== undefined) {
        fetched = fetch(source_data);
    }
    else {
        fetched = source_data;
    }
    if (encode !== undefined) {
        return encode(fetched, source_data);
    }
    else {
        return fetched;
    }
};
/* Called by parse */
const decode_and_deliver = ({ encoded, decode, context, deliver }) => {
    let decoded;
    if (decode !== undefined) {
        decoded = decode(encoded, context);
    }
    else {
        decoded = encoded;
    }
    if (deliver !== undefined) {
        deliver(decoded);
    }
    return decoded;
};
const factory = (serializer, deserializer, verify_size) => {
    return ((bits, transcoders = {}) => {
        if (!verify_size(bits)) {
            throw new Error(`Invalid size: ${bits}`);
        }
        const { encode, decode } = transcoders;
        const pack = (source_data, options = {}, fetch) => {
            const { data_view = new DataView(new ArrayBuffer(Math.ceil(bits / 8))), byte_offset = 0, little_endian = transcoders.little_endian } = options;
            const data = fetch_and_encode({ source_data, fetch, encode });
            /* Don't need to set parent on `data` because serializer doesn't care about parent context. */
            const size = (serializer(data, { bits, data_view, byte_offset, little_endian }) / 8);
            return { size, buffer: data_view.buffer };
        };
        const parse = (data_view, options = {}, deliver) => {
            const { byte_offset = 0, little_endian = transcoders.little_endian, context } = options;
            const parsed = deserializer({ bits, data_view, byte_offset, little_endian });
            const data = decode_and_deliver({ parsed: set_parent(parsed, context), decode, deliver });
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
    const pack = (source_data, options = {}, fetch) => {
        const { data_view, byte_offset = 0 } = options;
        const size = numeric(length, source_data);
        const buffer = fetch_and_encode({ source_data, fetch, encode });
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
        const data = decode_and_deliver({ parsed: set_parent(buffer, context), decode, deliver });
        return { data, size };
    };
    return { pack, parse };
};
export const Padding = (size) => {
    const pack = (source_data, options = {}, fetch) => {
        size = numeric(size, source_data);
        return { size, buffer: options.data_view === undefined ? new ArrayBuffer(Math.ceil(size)) : options.data_view.buffer };
    };
    const parse = (data_view, options = {}, deliver) => {
        size = numeric(size, options.context);
        return { size, data: null };
    };
    return { pack, parse };
};
export const Branch = (chooser, choices, default_choice) => {
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
    const pack = (source_data, options = {}, fetch) => {
        return choose(source_data).pack(source_data, options, fetch);
    };
    const parse = (data_view, options = {}, deliver) => {
        return choose(options.context).parse(data_view, options, deliver);
    };
    return { parse, pack };
};
export const Embed = (embedded) => {
    const pack = (source_data, options, fetch) => {
        if (embedded instanceof Array) {
            return embedded.pack(source_data, options, undefined, fetch);
        }
        else if (embedded instanceof Map) {
            return embedded.pack(source_data, options, undefined);
        }
        else {
            return embedded.pack(source_data, options, fetch);
        }
    };
    const parse = (data_view, options = {}, deliver) => {
        if (embedded instanceof Array) {
            return embedded.parse(data_view, options, undefined, options.context);
        }
        else if (embedded instanceof Map) {
            return embedded.parse(data_view, options, undefined, options.context);
        }
        else {
            return embedded.parse(data_view, options, deliver);
        }
    };
    return { pack, parse };
};
export const Binary_Map = (transcoders = {}, iterable) => {
    if (transcoders instanceof Array) {
        [transcoders, iterable] = [iterable, transcoders];
    }
    const { encode, decode, little_endian: _little_endian } = transcoders;
    const map = new Map();
    map.pack = (source_data, options = {}, fetch) => {
        let { data_view, byte_offset = 0, little_endian = _little_endian } = options;
        const encoded = fetch_and_encode({ source_data, fetch, encode });
        const packed = [];
        const fetcher = (key) => (source) => {
            const value = source.get(key);
            if (value === undefined) {
                throw new Error(`Insufficient data for serialization: ${key} not in ${source_data}`);
            }
            return value;
        };
        let offset = 0;
        for (const [key, item] of map) {
            const { size, buffer } = item.pack(set_parent(encoded, source_data), { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian }, fetcher(key));
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
        const { byte_offset = 0, little_endian = _little_endian, context } = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = set_parent(new Map(), context);
            remove_parent_symbol = true;
        }
        let offset = 0;
        for (const [key, item] of map) {
            const { data, size } = item.parse(data_view, { byte_offset: byte_offset + offset, little_endian, context: results }, (data) => results.set(key, data));
            offset += size;
        }
        const data = decode_and_deliver({ parsed: results, decode, deliver });
        remove_parent(results, remove_parent_symbol);
        return { data, size: offset };
    };
    return map;
};
const concat_buffers = (packed, byte_length) => {
    const data_view = new DataView(new ArrayBuffer(Math.ceil(byte_length)));
    let _offset = 0;
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
        array.pack(bytes, { data_view, byte_offset: _offset });
        _offset += size;
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
    const { encode, decode, little_endian: _little_endian } = extract_array_options(elements);
    const array = new Array(...elements);
    array.pack = (source_data, options = {}, fetch, fetcher) => {
        let { data_view, byte_offset = 0, little_endian = _little_endian } = options;
        const encoded = fetch_and_encode({ source_data, fetch, encode });
        const packed = [];
        if (fetcher === undefined) {
            const iterator = encoded[Symbol.iterator]();
            fetcher = (source_data) => {
                const value = iterator.next().value;
                if (value === undefined) {
                    throw new Error(`Insufficient data for serialization: ${source_data}`);
                }
                return value;
            };
        }
        const store = (result) => {
            if (data_view === undefined) {
                packed.push(result);
            }
        };
        const size = array.__pack_loop(set_parent(encoded, source_data), { data_view, byte_offset, little_endian }, fetcher, store);
        if (data_view === undefined) {
            data_view = concat_buffers(packed, size);
        }
        return { size, buffer: data_view.buffer };
    };
    array.__pack_loop = (data, { data_view, byte_offset = 0, little_endian }, fetcher, store) => {
        let offset = 0;
        for (const item of array) {
            const { size, buffer } = item.pack(data, { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian }, fetcher);
            store({ size, buffer });
            offset += size;
        }
        return offset;
    };
    array.parse = (data_view, options = {}, deliver, results) => {
        const { byte_offset = 0, little_endian = _little_endian, context } = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = set_parent(new Array(), context);
            remove_parent_symbol = true;
        }
        const size = array.__parse_loop(data_view, { byte_offset, little_endian, context: results }, (data) => results.push(data));
        const data = decode_and_deliver({ parsed: remove_parent(results, remove_parent_symbol), decode, deliver });
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
    array.__pack_loop = (data, { data_view, byte_offset = 0, little_endian }, fetcher, store) => {
        let offset = 0;
        if (count !== undefined) {
            const repeat = numeric(count, data);
            for (let i = 0; i < repeat; i++) {
                offset += pack_loop(data, { data_view, byte_offset: byte_offset + offset, little_endian }, fetcher, store);
            }
        }
        else if (bytes !== undefined) {
            const repeat = numeric(bytes, data);
            while (offset < repeat) {
                offset += pack_loop(data, { data_view, byte_offset: byte_offset + offset, little_endian }, fetcher, store);
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
    array.__parse_loop = (data_view, { byte_offset = 0, little_endian, context }, deliver) => {
        let offset = 0;
        if (count !== undefined) {
            const repeat = numeric(count, context);
            for (let i = 0; i < repeat; i++) {
                offset += parse_loop(data_view, { byte_offset: byte_offset + offset, little_endian, context }, deliver);
            }
        }
        else if (bytes !== undefined) {
            const repeat = numeric(bytes, context);
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