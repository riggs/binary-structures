import { uint_pack, int_pack, float_pack, uint_unpack, int_unpack, float_unpack, utf8_pack, utf8_unpack } from './serialization';
// interface ByteArray extends Transcoder_Options {
//     [index: number]: Struct<any, Uint_Sizes> | ByteObject | ByteArray | undefined
// }
//
// interface ByteObject extends Transcoder_Options {
//     [name: string]: Struct<any, Uint_Sizes> | ByteObject | ByteArray | undefined | boolean | ContextFunction<any, any>
// }
export const Uint = ({ encode, decode, little_endian }) => {
    return { encode, decode, little_endian, pack: uint_pack, unpack: uint_unpack };
};
export const Int = ({ encode, decode, little_endian }) => {
    return { encode, decode, little_endian, pack: int_pack, unpack: int_unpack };
};
export const Float = ({ encode, decode, little_endian }) => {
    return { encode, decode, little_endian, pack: float_pack, unpack: float_unpack };
};
export const Utf8 = ({ encode, decode }) => {
    return { encode, decode, pack: utf8_pack, unpack: utf8_unpack };
};
//# sourceMappingURL=transcode.js.map