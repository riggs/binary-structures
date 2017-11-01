import { Bits_Sizes, Uint_Sizes, Int_Sizes, Float_Sizes, uint_pack, int_pack, float_pack, uint_parse, int_parse, float_parse, utf8_pack, utf8_parse } from './serialization';
import './improved_map';
/* Need to hang Context_Parent off the global Symbol because of Typescript deficiency */
Symbol.Context_Parent = Symbol.for("Context_Parent");
export const inspect_transcoder = (data, context) => {
    console.log({ data, context });
    return data;
};
export const inspect = {
    encode: inspect_transcoder,
    decode: inspect_transcoder,
};
const bakery /* factory that makes Bytes */ = (serializer, deserializer, verify_size) => {
    return ((bits, transcoders = {}) => {
        if (!verify_size(bits)) {
            throw new Error(`Invalid size: ${bits}`);
        }
        const { encode, decode } = transcoders;
        const pack = (data, options = {}, fetch) => {
            let { data_view = new DataView(new ArrayBuffer(Math.ceil(bits / 8))), byte_offset = 0, little_endian = transcoders.little_endian, context } = options;
            if (fetch !== undefined) {
                data = fetch(data);
            }
            if (encode !== undefined) {
                data = encode(data, context);
            }
            const size = (serializer(data, { bits, data_view, byte_offset, little_endian }) / 8);
            return { size, buffer: data_view.buffer };
        };
        const parse = (data_view, options = {}, deliver) => {
            let { byte_offset = 0, little_endian = transcoders.little_endian, context } = options;
            let data = deserializer({ bits, data_view, byte_offset, little_endian });
            if (decode !== undefined) {
                data = decode(data, context);
            }
            if (deliver !== undefined) {
                deliver(data);
            }
            return { data, size: bits / 8 };
        };
        return { pack, parse };
    });
};
export const Bits = bakery(uint_pack, uint_parse, (s) => Bits_Sizes.includes(s));
export const Uint = bakery(uint_pack, uint_parse, (s) => Uint_Sizes.includes(s));
export const Int = bakery(int_pack, int_parse, (s) => Int_Sizes.includes(s));
export const Float = bakery(float_pack, float_parse, (s) => Float_Sizes.includes(s));
export const Utf8 = bakery(utf8_pack, utf8_parse, (s) => s % 8 === 0 && s >= 0);
export const Branch = (choose, choices) => {
    const pack = (data, options = {}, fetch) => {
        return choices[choose(options.context)].pack(data, options, fetch);
    };
    const parse = (data_view, options = {}, deliver) => {
        return choices[choose(options.context)].parse(data_view, options, deliver);
    };
    return { parse, pack };
};
export const Embed = (thing) => {
    const pack = (data, options, fetch) => {
        if (thing instanceof Byte_Array_Class) {
            return thing.pack(data, options, undefined, fetch);
        }
        else if (thing instanceof Byte_Map_Class) {
            return thing.pack(data, options, undefined);
        }
        else {
            return thing.pack(data, options, fetch);
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
const concat_buffers = (packed, byte_length) => {
    const data_view = new DataView(new ArrayBuffer(Math.ceil(byte_length)));
    let _offset = 0;
    for (const { size, buffer } of packed) {
        /* Copy all the data from the returned buffers into one grand buffer. */
        const bytes = Array.from(new Uint8Array(buffer));
        /* Create a Byte Array with the appropriate number of Uint(8)s, possibly with a trailing Bits. */
        const array = [];
        for (let i = 0; i < Math.floor(size); i++) {
            array.push(Uint(8));
        }
        if (size % 1) {
            array.push(Bits((size % 1) * 8));
        }
        /* Pack the bytes into the buffer */
        Byte_Array(...array).pack(bytes, { data_view, byte_offset: _offset });
        _offset += size;
    }
    return data_view;
};
class Byte_Array_Class extends Array {
    constructor({ encode, decode, little_endian }, ...elements) {
        super(...elements);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }
    pack(data, options = {}, fetch, fetcher) {
        let { data_view, byte_offset = 0, little_endian = this.little_endian, context = data } = options;
        if (fetch !== undefined) {
            data = fetch(data);
        }
        if (this.encode !== undefined) {
            data = this.encode(data, context);
        }
        let offset = 0;
        const packed = [];
        if (fetcher === undefined) {
            const iterator = data[Symbol.iterator]();
            fetcher = () => iterator.next().value;
        }
        for (const item of this) {
            const { size, buffer } = item.pack(data, { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context }, fetcher);
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
        if (results === undefined) {
            results = [];
            results[Symbol.Context_Parent] = context;
        }
        let offset = 0;
        for (const item of this) {
            const { data, size } = item.parse(data_view, { byte_offset: byte_offset + offset, little_endian, context: results }, (data) => results.push(data));
            offset += size;
        }
        if (this.decode !== undefined) {
            results = this.decode(results, context);
        }
        if (deliver !== undefined) {
            deliver(results);
        }
        return { data: results, size: offset };
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
        if (elements.length > 0) {
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
    const options = extract_array_options(elements);
    return new Byte_Array_Class(options, ...elements);
};
class Byte_Map_Class extends Map {
    constructor({ encode, decode, little_endian }, iterable) {
        super(iterable);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }
    pack(data, options = {}, fetch) {
        let { data_view, byte_offset = 0, little_endian = this.little_endian, context = data } = options;
        if (fetch !== undefined) {
            data = fetch(data);
        }
        if (this.encode !== undefined) {
            data = this.encode(data, context);
        }
        const packed = [];
        let offset = 0;
        for (const [key, item] of this) {
            const { size, buffer } = item.pack(data, { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context }, (data) => data[key]);
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
        if (results === undefined) {
            results = new Map();
            results[Symbol.Context_Parent] = context;
        }
        let offset = 0;
        for (const [key, item] of this) {
            const { data, size } = item.parse(data_view, { byte_offset: byte_offset + offset, little_endian, context: results }, (data) => results.set(key, data));
            offset += size;
        }
        if (this.decode !== undefined) {
            results = this.decode(results, context);
        }
        if (deliver !== undefined) {
            deliver(results);
        }
        return { data: results, size: offset };
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
//# sourceMappingURL=transcode.js.map