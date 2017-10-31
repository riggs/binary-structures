import { Bits_Sizes, Uint_Sizes, Int_Sizes, Float_Sizes, uint_pack, int_pack, float_pack, uint_parse, int_parse, float_parse, utf8_pack, utf8_parse } from './serialization';
import './improved_map';
/* Need to hang Parent off the global Symbol because of Typescript deficiency */
Symbol.Parent = Symbol.for("Parent");
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
        const pack = (data, options = {}) => {
            let { data_view = new DataView(new ArrayBuffer(Math.ceil(bits / 8))), byte_offset = 0, little_endian = transcoders.little_endian, context } = options;
            if (encode !== undefined) {
                data = encode(data, context);
            }
            const size = (serializer(data, { bits, data_view, byte_offset, little_endian }) / 8);
            return { size, buffer: data_view.buffer };
        };
        const parse = ({ data_view, byte_offset = 0, little_endian = transcoders.little_endian, context }) => {
            let data = deserializer({ bits, data_view, byte_offset, little_endian });
            if (decode !== undefined) {
                data = decode(data, context);
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
/* A unique marker used to indicate the referenced Structure should be embedded into the parent */
let embed = new Map();
export const Embed = (thing) => {
    /* Don't use the default decoder if the thing is embedded */
    if (thing.decode === default_decoder) {
        thing.decode = undefined;
    }
    const parse_symbol = Symbol();
    const parse = (options) => {
        const { size, data } = thing.parse(options);
        embed.set(parse_symbol, data);
        return { size, data: parse_symbol };
    };
    const pack_symbol = Symbol();
    embed.set(pack_symbol, thing);
    const pack = (data, options) => {
        return { size: 0, buffer: pack_symbol };
    };
    return { pack: pack, parse };
};
export const Branch = (choose, choices) => {
    const parse = (options) => {
        return choices[choose(options.context)].parse(options);
    };
    const pack = (data, options = {}) => {
        return choices[choose(options.context)].pack(data, options);
    };
    return { parse, pack };
};
/* Declared in this namespace because Object.getPrototypeOf(thing).default_decoder returns undefined. */
const default_decoder = (data) => {
    if (data instanceof Map) {
        return data.toObject();
    }
    return Array.from(data);
};
class Byte_Array_Class extends Array {
    constructor({ encode, decode = default_decoder, little_endian }, ...elements) {
        super(...elements);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }
    parse({ data_view, byte_offset = 0, little_endian = this.little_endian, context }) {
        let offset = 0;
        let array = [];
        array[Symbol.Parent] = context;
        for (const item of this) {
            let { data, size } = item.parse({ data_view, byte_offset: byte_offset + offset, little_endian, context: array });
            offset += size;
            if (typeof data === 'symbol') {
                data = embed.pop(data);
                if (!(data instanceof Array)) {
                    throw new Error(`Unable to Embed ${data} into ${this}`);
                }
                array.push(...data);
            }
            else {
                array.push(data);
            }
        }
        if (this.decode !== undefined) {
            array = this.decode(array, context);
        }
        return { data: array, size: offset };
    }
    ;
    pack(data, options = {}, index = 0) {
        let { data_view, byte_offset = 0, little_endian, context = data } = options;
        let offset = 0;
        const packed = [];
        for (const item of this) {
            const datum = this.encode !== undefined ? this.encode(data[index], context) : data[index];
            let { size, buffer } = item.pack(datum, { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context });
            if (typeof buffer === 'symbol') {
                ({ size, buffer, index } = embed.get(buffer).pack(data, { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context }, index));
            }
            else {
                index++;
            }
            if (data_view === undefined) {
                packed.push({ size, buffer });
            }
            offset += size;
        }
        if (data_view === undefined) {
            data_view = new DataView(new ArrayBuffer(Math.ceil(offset)));
            Byte_Array_Class.concat_buffers(packed, data_view);
        }
        return { size: offset, buffer: data_view.buffer, index };
    }
    static concat_buffers(packed, data_view) {
        let _offset = 0;
        for (const { size, buffer } of packed) {
            /* Copy all the data from the returned buffers into one grand buffer. */
            const bytes = Array.from(new Uint8Array(buffer));
            /* Create a Byte Array with the appropriate number of Uint(8)s, possibly with a trailing Bits. */
            const byte_array = Byte_Array();
            for (let i = 0; i < Math.floor(size); i++) {
                byte_array.push(Uint(8));
            }
            if (size % 1) {
                byte_array.push(Bits((size % 1) * 8));
            }
            /* Pack the bytes into the buffer */
            byte_array.pack(bytes, { data_view, byte_offset: _offset });
            _offset += size;
        }
    }
}
const _extract_options = (elements) => {
    const options = {};
    if (elements.length > 0 && typeof elements[0] !== "symbol") {
        const first = elements[0];
        if (!first.hasOwnProperty('pack') && !first.hasOwnProperty('parse')) {
            Object.assign(options, first);
            elements.shift();
        }
        if (elements.length > 0 && typeof elements[elements.length - 1] !== "symbol") {
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
    const options = _extract_options(elements);
    return new Byte_Array_Class(options, ...elements);
};
class Repeat_Class extends Byte_Array_Class {
    constructor(repeat, options, ...elements) {
        super(options, ...elements);
        this.repeat = repeat;
    }
    parse({ data_view, byte_offset = 0, little_endian = this.little_endian, context }) {
        let offset = 0;
        let array = [];
        array[Symbol.Parent] = context;
        const decode = this.decode;
        this.decode = undefined;
        let count = 0;
        const repeats = typeof this.repeat === "number" ? this.repeat : this.repeat(context);
        while (count < repeats) {
            const { data, size } = super.parse({ data_view, byte_offset: byte_offset + offset, little_endian, context: array });
            array.push(...data);
            offset += size;
            count++;
        }
        this.decode = decode;
        if (this.decode !== undefined) {
            array = this.decode(array, context);
        }
        return { data: array, size: offset };
    }
    pack(data, options = {}, index = 0) {
        let { data_view, byte_offset = 0, little_endian, context = data } = options;
        let offset = 0;
        const packed = [];
        let size, buffer;
        let count = 0;
        const repeats = typeof this.repeat === "number" ? this.repeat : this.repeat(context);
        while (count < repeats) {
            ({ size, buffer, index } = super.pack(data, { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context }, index));
            if (data_view === undefined) {
                packed.push({ size, buffer });
            }
            offset += size;
            count++;
        }
        if (data_view === undefined) {
            data_view = new DataView(new ArrayBuffer(Math.ceil(offset)));
            Byte_Array_Class.concat_buffers(packed, data_view);
        }
        return { size: offset, buffer: data_view.buffer, index };
    }
}
export const Repeat = (repeat, ...elements) => {
    const options = _extract_options(elements);
    return new Repeat_Class(repeat, options, ...elements);
};
class Byte_Map_Class extends Map {
    constructor({ encode, decode = default_decoder, little_endian }, iterable) {
        super(iterable);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }
    parse({ data_view, byte_offset = 0, little_endian = this.little_endian, context }) {
        let offset = 0;
        let map = new Map();
        map[Symbol.Parent] = context;
        for (const [key, value] of this) {
            let { data, size } = value.parse({ data_view, byte_offset: byte_offset + offset, little_endian, context: map });
            offset += size;
            if (typeof data === 'symbol') {
                data = embed.pop(data);
                map.update(data);
            }
            else {
                map.set(key, data);
            }
        }
        if (this.decode !== undefined) {
            map = this.decode(map, context);
        }
        return { data: map, size: offset };
    }
}
export const Byte_Map = (options, iterable) => {
    if (options instanceof Array) {
        const _ = iterable;
        iterable = options;
        options = _;
    }
    if (options === undefined) {
        options = {};
    }
    return new Byte_Map_Class(options, iterable);
};
//# sourceMappingURL=transcode.js.map