import { Bits_Sizes, Uint_Sizes, Int_Sizes, Float_Sizes, uint_pack, int_pack, float_pack, uint_parse, int_parse, float_parse, utf8_pack, utf8_parse } from './serialization';
export const bits = (size, { encode, decode }) => {
    if (!Bits_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return { size, encode, decode, pack: uint_pack, parse: uint_parse };
};
export const uint = (size, { encode, decode, little_endian }) => {
    if (!Uint_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return { size, encode, decode, little_endian, pack: uint_pack, parse: uint_parse };
};
export const int = (size, { encode, decode, little_endian }) => {
    if (!Int_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return { size, encode, decode, little_endian, pack: int_pack, parse: int_parse };
};
export const float = (size, { encode, decode, little_endian }) => {
    if (!Float_Sizes.includes(size)) {
        throw new Error(`Invalid size: ${size}`);
    }
    return { size, encode, decode, little_endian, pack: float_pack, parse: float_parse };
};
export const utf8 = (size, { encode, decode }) => {
    if (size % 8 !== 0 || size < 0) {
        throw new Error(`Invalid size: ${size}`);
    }
    return { size, encode, decode, pack: utf8_pack, parse: utf8_parse };
};
let embed_counter = 1;
let embed_cache = new Map();
export const embed = (thing) => {
    const nonce = Symbol(embed_counter++);
    embed_cache.set(nonce, thing);
    return nonce;
};
export class Byte_Array extends Array {
    constructor({ encode, decode, little_endian }, ...elements) {
        super(...elements);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }
    pack(data, context = {}) {
        const array = Array.from(typeof this.encode === 'function' ? this.encode(data, context) : data);
    }
}
export class Byte_Map extends Map {
    constructor({ encode, decode = Byte_Map.default_decoder, little_endian }, iterable) {
        super(iterable);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }
    static default_decoder(map, context) {
        return map.asObject();
    }
}
//# sourceMappingURL=transcode.js.map