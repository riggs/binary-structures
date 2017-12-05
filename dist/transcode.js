import { Bits_Sizes, Uint_Sizes, Int_Sizes, Float_Sizes, uint_pack, int_pack, float_pack, uint_parse, int_parse, float_parse, utf8_pack, utf8_parse, hex_buffer } from './serialization';
/* Need to hang Context_Parent off the global Symbol because of Typescript deficiency */
Symbol.Context_Parent = Symbol.for("Context_Parent");
export class SerializationError extends Error {
    constructor(message, byte_offset, context, data_view) {
        super(message);
        this.name = 'SerializationError';
        this.bytes = (data_view !== undefined) ? hex_buffer(data_view.buffer) : '';
        this.byte_offset = byte_offset || 0;
        this.context = context;
    }
}
export const inspect_transcoder = (data, context) => {
    console.log({ data, context });
    return data;
};
export const inspect = {
    encode: inspect_transcoder,
    decode: inspect_transcoder,
};
const fetch_and_encode = ({ source_data, fetch, encode, context }) => {
    let fetched;
    if (fetch !== undefined) {
        fetched = fetch(source_data);
    }
    else {
        fetched = source_data;
    }
    if (encode !== undefined) {
        return encode(fetched, context);
    }
    else {
        return fetched;
    }
};
const decode_and_deliver = ({ parsed_data, decode, context, deliver }) => {
    let decoded;
    if (decode !== undefined) {
        decoded = decode(parsed_data, context);
    }
    else {
        decoded = parsed_data;
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
            const { data_view = new DataView(new ArrayBuffer(Math.ceil(bits / 8))), byte_offset = 0, little_endian = transcoders.little_endian, context } = options;
            const data = fetch_and_encode({ source_data, fetch, encode, context });
            const size = (serializer(data, { bits, data_view, byte_offset, little_endian }) / 8);
            return { size, buffer: data_view.buffer };
        };
        const parse = (data_view, options = {}, deliver) => {
            const { byte_offset = 0, little_endian = transcoders.little_endian, context } = options;
            const parsed_data = deserializer({ bits, data_view, byte_offset, little_endian });
            const data = decode_and_deliver({ parsed_data, decode, context, deliver });
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
const numeric = (n, context) => typeof n === 'number' ? n : n(context);
/** Byte_Buffer doesn't do any serialization, but just copies bytes to/from an ArrayBuffer that's a subset of the
 * serialized buffer. Byte_Buffer only works on byte-aligned data.
 *
 * @param {Numeric} length
 * @param {Transcoders<ArrayBuffer, any>} transcoders
 */
export const Byte_Buffer = (length, transcoders = {}) => {
    const { encode, decode } = transcoders;
    const pack = (source_data, options = {}, fetch) => {
        const { data_view, byte_offset = 0, context } = options;
        const buffer = fetch_and_encode({ source_data, fetch, encode, context });
        const size = numeric(length, context);
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
        const data = decode_and_deliver({ parsed_data: buffer, decode, context, deliver });
        return { data, size };
    };
    return { pack, parse };
};
export const Branch = (chooser, choices, default_choice) => {
    const choose = (options = {}, data_view) => {
        let choice = chooser(options.context);
        if (choices.hasOwnProperty(choice)) {
            return choices[choice];
        }
        else {
            if (default_choice !== undefined) {
                return default_choice;
            }
            else {
                const { byte_offset, context } = options;
                data_view = data_view || options.data_view;
                throw new SerializationError(`Invalid choice: ${choice}`, byte_offset, context, data_view);
            }
        }
    };
    const pack = (source_data, options = {}, fetch) => {
        return choose(options).pack(source_data, options, fetch);
    };
    const parse = (data_view, options = {}, deliver) => {
        return choose(options, data_view).parse(data_view, options, deliver);
    };
    return { parse, pack };
};
export const Embed = (thing) => {
    const pack = (source_data, options, fetch) => {
        if (thing instanceof Byte_Array_Class) {
            return thing.pack(source_data, options, undefined, fetch);
        }
        else if (thing instanceof Byte_Map_Class) {
            return thing.pack(source_data, options, undefined);
        }
        else {
            return thing.pack(source_data, options, fetch);
        }
    };
    const parse = (data_view, options = {}, deliver) => {
        if (thing instanceof Byte_Array_Class) {
            return thing.parse(data_view, options, undefined, options.context);
        }
        else if (thing instanceof Byte_Map_Class) {
            return thing.parse(data_view, options, undefined, options.context);
        }
        else {
            return thing.parse(data_view, options, deliver);
        }
    };
    return { pack, parse };
};
export const Padding = (value = 0) => {
    let size;
    if (typeof value === 'object') {
        let { bits = 0, bytes = 0 } = value;
        size = bits / 8 + bytes;
    }
    else {
        size = value;
    }
    if (size < 0) {
        throw new Error(`Invalid size: ${size} bytes`);
    }
    const pack = (source_data, options = {}, fetch) => {
        return { size, buffer: options.data_view === undefined ? new ArrayBuffer(Math.ceil(size)) : options.data_view.buffer };
    };
    const parse = (data_view, options = {}, deliver) => {
        return { size, data: null };
    };
    return { pack, parse };
};
export class Byte_Map_Class extends Map {
    constructor(options = {}, iterable) {
        super(iterable);
        let { encode, decode, little_endian } = options;
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }
    pack(source_data, options = {}, fetch) {
        let { data_view, byte_offset = 0, little_endian = this.little_endian, context = source_data } = options;
        const data = fetch_and_encode({ source_data, fetch, encode: this.encode, context });
        const packed = [];
        const fetcher = (key) => (source) => {
            const value = source.get(key);
            if (value === undefined) {
                throw new Error(`Insufficient data for serialization: ${source_data}`);
            }
            return value;
        };
        let offset = 0;
        for (const [key, item] of this) {
            const { size, buffer } = item.pack(data, { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context }, fetcher(key));
            if (data_view === undefined) {
                packed.push({ size, buffer });
            }
            offset += size;
        }
        if (data_view === undefined) {
            data_view = concat_buffers(packed, offset);
        }
        return { size: offset, buffer: data_view.buffer };
    }
    parse(data_view, options = {}, deliver, results) {
        const { byte_offset = 0, little_endian = this.little_endian, context } = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = new Map();
            results[Symbol.Context_Parent] = context;
            remove_parent_symbol = true;
        }
        let offset = 0;
        for (const [key, item] of this) {
            const { data, size } = item.parse(data_view, { byte_offset: byte_offset + offset, little_endian, context: results }, (data) => results.set(key, data));
            offset += size;
        }
        if (remove_parent_symbol) {
            delete results[Symbol.Context_Parent];
        }
        const data = decode_and_deliver({ parsed_data: results, decode: this.decode, context, deliver });
        return { data, size: offset };
    }
}
export const Byte_Map = (options, iterable) => {
    if (options instanceof Array) {
        const _ = iterable;
        iterable = options;
        options = _;
    }
    return new Byte_Map_Class(options || {}, iterable);
};
const concat_buffers = (packed, byte_length) => {
    const data_view = new DataView(new ArrayBuffer(Math.ceil(byte_length)));
    let _offset = 0;
    for (const { size, buffer } of packed) {
        /* Copy all the data from the returned buffers into one grand buffer. */
        const bytes = Array.from(new Uint8Array(buffer));
        /* Create a Byte Array with the appropriate number of Uint(8)s, possibly with a trailing Bits. */
        const array = new Byte_Array_Class();
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
export class Byte_Array_Class extends Array {
    constructor(options = {}, ...elements) {
        super(...elements);
        let { encode, decode, little_endian } = options;
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }
    pack(source_data, options = {}, fetch, fetcher) {
        let { data_view, byte_offset = 0, little_endian = this.little_endian, context = source_data } = options;
        const data = fetch_and_encode({ source_data, fetch, encode: this.encode, context });
        const packed = [];
        if (fetcher === undefined) {
            const iterator = data[Symbol.iterator]();
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
        const size = this.__pack_loop(data, { data_view, byte_offset, little_endian, context }, fetcher, store);
        if (data_view === undefined) {
            data_view = concat_buffers(packed, size);
        }
        return { size, buffer: data_view.buffer };
    }
    __pack_loop(data, { data_view, byte_offset = 0, little_endian, context }, fetcher, store) {
        let offset = 0;
        for (const item of this) {
            const { size, buffer } = item.pack(data, { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context }, fetcher);
            store({ size, buffer });
            offset += size;
        }
        return offset;
    }
    parse(data_view, options = {}, deliver, results) {
        const { byte_offset = 0, little_endian = this.little_endian, context } = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = [];
            results[Symbol.Context_Parent] = context;
            remove_parent_symbol = true;
        }
        const size = this.__parse_loop(data_view, { byte_offset, little_endian, context: results }, (data) => results.push(data));
        if (remove_parent_symbol) {
            delete results[Symbol.Context_Parent];
        }
        const data = decode_and_deliver({ parsed_data: results, decode: this.decode, context, deliver });
        return { data, size };
    }
    __parse_loop(data_view, { byte_offset = 0, little_endian, context }, deliver) {
        let offset = 0;
        for (const item of this) {
            const { data, size } = item.parse(data_view, { byte_offset: byte_offset + offset, little_endian, context }, deliver);
            offset += size;
        }
        return offset;
    }
}
/* This would be much cleaner if JavaScript had interfaces. Or I could make everything subclass Struct... */
const extract_array_options = (elements) => {
    const options = {};
    if (elements.length > 0) {
        const first = elements[0];
        if (!first.hasOwnProperty('pack') && !first.hasOwnProperty('parse')) {
            Object.assign(options, first);
            elements.shift();
        }
        else {
            const last = elements[elements.length - 1];
            if (!last.hasOwnProperty('pack') && !last.hasOwnProperty('parse')) {
                Object.assign(options, last);
                elements.pop();
            }
        }
    }
    return options;
};
export const Byte_Array = (...elements) => {
    return new Byte_Array_Class(extract_array_options(elements), ...elements);
};
export class Byte_Repeat extends Byte_Array_Class {
    constructor(options, ...elements) {
        super(options, ...elements);
        const { count, bytes } = options;
        if (count === undefined && bytes === undefined) {
            throw new Error("One of count or bytes must specified in options.");
        }
        this.count = count;
        this.bytes = bytes;
    }
    __pack_loop(data, { data_view, byte_offset = 0, little_endian, context }, fetcher, store) {
        let offset = 0;
        if (this.count !== undefined) {
            const count = numeric(this.count, context);
            for (let i = 0; i < count; i++) {
                offset += super.__pack_loop(data, { data_view, byte_offset: byte_offset + offset, little_endian, context }, fetcher, store);
            }
        }
        else if (this.bytes !== undefined) {
            const bytes = numeric(this.bytes, context);
            while (offset < bytes) {
                offset += super.__pack_loop(data, { data_view, byte_offset: byte_offset + offset, little_endian, context }, fetcher, store);
            }
            if (offset > bytes) {
                throw new Error(`Cannot pack into ${bytes} bytes.`);
            }
        }
        else {
            throw new Error("One of count or bytes must specified in options.");
        }
        return offset;
    }
    __parse_loop(data_view, { byte_offset = 0, little_endian, context }, deliver) {
        let offset = 0;
        if (this.count !== undefined) {
            const count = numeric(this.count, context);
            for (let i = 0; i < count; i++) {
                offset += super.__parse_loop(data_view, { byte_offset: byte_offset + offset, little_endian, context }, deliver);
            }
        }
        else if (this.bytes !== undefined) {
            const bytes = numeric(this.bytes, context);
            while (offset < bytes) {
                offset += super.__parse_loop(data_view, { byte_offset: byte_offset + offset, little_endian, context }, deliver);
            }
            if (offset > bytes) {
                throw new Error(`Cannot parse exactly ${bytes} bytes.`);
            }
        }
        else {
            throw new Error("One of count or bytes must specified in options.");
        }
        return offset;
    }
}
export const Repeat = (...elements) => {
    return new Byte_Repeat(extract_array_options(elements), ...elements);
};
//# sourceMappingURL=transcode.js.map