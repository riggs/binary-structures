import {
    Uint_Sizes,
    Int_Sizes,
    Float_Sizes,
    Serializer,
    uint_pack,
    int_pack,
    float_pack,
    Deserializer,
    uint_unpack,
    int_unpack,
    float_unpack,
    utf8_pack,
    utf8_unpack
} from './serialization';

/** These functions used internally to the library to pack/unpack ArrayBuffers. */
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
    pack: Serializer<Type, Sizes>,
    unpack: Deserializer<Type, Sizes>,
}

// interface ByteArray extends Transcoder_Options {
//     [index: number]: Struct<any, Uint_Sizes> | ByteObject | ByteArray | undefined
// }
//
// interface ByteObject extends Transcoder_Options {
//     [name: string]: Struct<any, Uint_Sizes> | ByteObject | ByteArray | undefined | boolean | ContextFunction<any, any>
// }

export const Uint: ((options: Transcoder_Options<number>) => Struct<number, Uint_Sizes>) = ({encode, decode, little_endian}) => {
    return {encode, decode, little_endian, pack: uint_pack, unpack: uint_unpack}
};

export const Int: ((options: Transcoder_Options<number>) => Struct<number, Int_Sizes>) = ({encode, decode, little_endian}) => {
    return {encode, decode, little_endian, pack: int_pack, unpack: int_unpack}
};

export const Float: ((options: Transcoder_Options<number>) => Struct<number, Float_Sizes>) = ({encode, decode, little_endian}) => {
    return {encode, decode, little_endian, pack: float_pack, unpack: float_unpack}
};

export const Utf8: ((options: Transcoder_Options<string>) => Struct<string, number>) = ({encode, decode}) => {
    return {encode, decode, pack: utf8_pack, unpack: utf8_unpack}
};
