import {
    Bits_Sizes,
    Uint_Sizes,
    Int_Sizes,
    Float_Sizes,
    bit_offset,
    Serializer,
    uint_pack,
    int_pack,
    float_pack,
    Deserializer,
    uint_parse,
    int_parse,
    float_parse,
    utf8_pack,
    utf8_parse
} from './serialization';

/** These functions used internally to the library to pack/parse ArrayBuffers. */
interface Context {

}

interface ContextFunction<V, R> {
    (value: V, context: Context): R;
}

/** These functions provided by library consumer to convert data to usable structures. */
interface Transcoders<T> {
    encode?: ContextFunction<any, T>,
    decode?: ContextFunction<T, any>,
    little_endian?: boolean
}

interface Struct<Type, Sizes> extends Transcoders<Type> {
    size: Sizes,
    pack: Serializer<Type, Sizes>,
    parse: Deserializer<Type, Sizes>,
}

interface Bytes<Type, Sizes> {
    (size: Sizes, options?: Transcoders<Type>): Struct<Type, Sizes>;
}

export const bits: Bytes<number, Bits_Sizes> = (size, options) => {
    const encode = options ? options.encode : undefined;
    const decode = options ? options.decode : undefined;
    if (!Bits_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return {size, encode, decode, pack: uint_pack, parse: uint_parse}
};

export const uint: Bytes<number, Uint_Sizes> = (size, options) => {
    const encode = options ? options.encode : undefined;
    const decode = options ? options.decode : undefined;
    const little_endian = options ? options.little_endian : undefined;
    if (!Uint_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return {size, encode, decode, little_endian, pack: uint_pack, parse: uint_parse}
};

export const int: Bytes<number, Int_Sizes> = (size, options) => {
    const encode = options ? options.encode : undefined;
    const decode = options ? options.decode : undefined;
    const little_endian = options ? options.little_endian : undefined;
    if (!Int_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return {size, encode, decode, little_endian, pack: int_pack, parse: int_parse}
};

export const float: Bytes<number, Float_Sizes> = (size, options) => {
    const encode = options ? options.encode : undefined;
    const decode = options ? options.decode : undefined;
    const little_endian = options ? options.little_endian : undefined;
    if (!Float_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return {size, encode, decode, little_endian, pack: float_pack, parse: float_parse}
};

export const utf8: Bytes<string, number> = (size, options) => {
    const encode = options ? options.encode : undefined;
    const decode = options ? options.decode : undefined;
    if (size % 8 !== 0 || size < 0) {
        throw new Error(`Invalid size: ${size}`);
    }
    return {size, encode, decode, pack: utf8_pack, parse: utf8_parse}
};

type Primatives = number | string;

/* A unique marker used to indicate the referenced Structure should be embedded into the parent */
type Embed = symbol;

type Structure = Struct<Primatives, number> | Byte_Array | Byte_Map | Embed;

let embed_counter = 1;
let embed_cache = new Map();
export const embed: ((thing?: Structure) => Embed) = (thing) => {
    const nonce = Symbol(embed_counter++);
    embed_cache.set(nonce, thing);
    return nonce;
};

export interface Byte_Array extends Transcoders<Array<any>>, Array<Structure> {}

interface Byte_Array_Constructor {
    new (options: Transcoders<Array<any>>, ...elements: Array<Structure>): Byte_Array;
}

interface Parse_Options {
    byte_offset?: number;
    bit_offset?: bit_offset;
    little_endian?: boolean | undefined;
}

export class Byte_Array extends Array<Structure> {
    constructor({encode, decode, little_endian}: Transcoders<Array<any>>, ...elements: Array<Structure>) {
        super(...elements);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    parse(buffer: ArrayBuffer | SharedArrayBuffer, {byte_offset = 0, bit_offset = 0, little_endian}: Parse_Options): {data: Array<any>, parsed_size: number} {
        let offset = byte_offset + bit_offset;
        const _little_endian = little_endian !== undefined ? little_endian : this.little_endian;
        const data_view = new DataView(buffer);
        const array: any[] = [];
        for (const item of this) {
            if (typeof item === 'symbol') {
                // TODO
            } else if (item instanceof Byte_Array) {    /* Identical to below case, split because of Typescript limitation. */
                const little_endian = item.little_endian !== undefined ? item.little_endian : _little_endian;
                const {data: parsed, parsed_size: size} = item.parse(buffer, {byte_offset: Math.floor(offset / 8), bit_offset: offset % 8 as bit_offset, little_endian});
                if (typeof item.decode === 'function') {
                    array.push(item.decode(parsed, array));
                } else {
                    array.push(parsed);
                }
                offset += size
            } else if (item instanceof Byte_Map) {    /* Identical to above case, split because of Typescript limitation. */
                const little_endian = item.little_endian !== undefined ? item.little_endian : _little_endian;
                const {data: parsed, parsed_size: size} = item.parse(buffer, {byte_offset: Math.floor(offset / 8), bit_offset: offset % 8 as bit_offset, little_endian});
                if (typeof item.decode === 'function') {
                    array.push(item.decode(parsed, array));
                } else {
                    array.push(parsed);
                }
                offset += size
            } else {
                const little_endian = item.little_endian !== undefined ? item.little_endian : _little_endian;
                const parsed = item.parse({size: item.size, bit_offset: offset % 8 as bit_offset, byte_offset: Math.floor(offset / 8), data_view, little_endian});
                if (typeof item.decode === 'function') {
                    array.push(item.decode(parsed, array));
                } else {
                    array.push(parsed);
                }
                offset += item.size;
            }
        }
        return {data: array, parsed_size: offset};
    }

    pack(data: any, context: Context = {}) {
        const array = Array.from(typeof this.encode === 'function' ? this.encode(data, context) : data);
    }
}

/* Keys must all ultimately be strings for safe conversion of Map into Object */
export interface Byte_Map extends Transcoders<Map<string, any>>, Map<string | Embed, Structure> {}

interface Byte_Map_Constructor {
    new (options: Transcoders<Map<string, any>>, iterable?: Array<[string | Embed, Structure]>): Byte_Map;
}

export class Byte_Map extends Map<string | Embed, Structure> {
    constructor({encode, decode = Byte_Map.default_decoder, little_endian}: Transcoders<Map<string, any>>, iterable?: Array<[string | Embed, Structure]>) {
        super(iterable);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    static default_decoder(map: Map<string, any>, context: Context) {
        return map.toObject();
    }

    parse(buffer: ArrayBuffer | SharedArrayBuffer, {byte_offset = 0, bit_offset = 0, little_endian}: Parse_Options): {data: any, parsed_size: number} {
        return {data: new Map().update(this), parsed_size: buffer.byteLength * 8};  // FIXME: Placeholder for Type checking.
    }
}
