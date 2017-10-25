import {
    Bits_Sizes,
    Uint_Sizes,
    Int_Sizes,
    Float_Sizes,
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
interface Transcoder_Options<T> {
    encode?: ContextFunction<any, T>,
    decode?: ContextFunction<T, any>,
    little_endian?: boolean | undefined
}

interface Struct<Type, Sizes> extends Transcoder_Options<Type> {
    size: Sizes,
    pack: Serializer<Type, Sizes>,
    parse: Deserializer<Type, Sizes>,
}

interface Bytes<Type, Sizes> {
    (size: Sizes, options: Transcoder_Options<Type>): Struct<Type, Sizes>;
}

export const bits: Bytes<number, Bits_Sizes> = (size, {encode, decode}) => {
    if (!Bits_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return {size, encode, decode, pack: uint_pack, parse: uint_parse}
};

export const uint: Bytes<number, Uint_Sizes> = (size, {encode, decode, little_endian}) => {
    if (!Uint_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return {size, encode, decode, little_endian, pack: uint_pack, parse: uint_parse}
};

export const int: Bytes<number, Int_Sizes> = (size, {encode, decode, little_endian}) => {
    if (!Int_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return {size, encode, decode, little_endian, pack: int_pack, parse: int_parse}
};

export const float: Bytes<number, Float_Sizes> = (size, {encode, decode, little_endian}) => {
    if (!Float_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return {size, encode, decode, little_endian, pack: float_pack, parse: float_parse}
};

export const utf8: Bytes<string, number> = (size, {encode, decode}) => {
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

export interface Byte_Array extends Transcoder_Options<Byte_Array>, Array<Structure> {}

interface Byte_Array_Constructor {
    new (options: Transcoder_Options<Byte_Array>, ...elements: Array<Structure>): Byte_Array;
}

export class Byte_Array extends Array<Structure> {
    constructor({encode, decode, little_endian}: Transcoder_Options<Byte_Array>, ...elements: Array<Structure>) {
        super(...elements);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    pack(data: any, context: Context = {}) {
        const array = Array.from(typeof this.encode === 'function' ? this.encode(data, context) : data);
    }
}

/* Keys must all ultimately be strings for safe conversion of Map into Object */
export interface Byte_Map extends Transcoder_Options<Byte_Map>, Map<string | Embed, Structure> {}

interface Byte_Map_Constructor {
    new (options: Transcoder_Options<Byte_Map>, iterable?: Array<[string | Embed, Structure]>): Byte_Map;
}

export class Byte_Map extends Map<string | Embed, Structure> {
    constructor({encode, decode = Byte_Map.default_decoder, little_endian}: Transcoder_Options<Byte_Map>, iterable?: Array<[string | Embed, Structure]>) {
        super(iterable);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    static default_decoder(map: Byte_Map, context: Context) {
        return map.asObject();
    }
}
