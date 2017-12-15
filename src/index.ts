export {hex, hex_buffer} from './serialization';
export {
    Context_Array,
    Context_Map,
    Encoder,
    Decoder,
    inspect,
    Parent,
    Bits,
    Uint,
    Int,
    Float,
    Utf8,
    Embed,
    Binary_Array,
    Binary_Map,
    Byte_Buffer,
    Repeat,
    Branch,
    Padding,
} from './transcode';

import {Uint, Int, Float, Padding, Struct} from './transcode';

export const Uint8: Struct<number, any> = Uint(8);
export const Uint16: Struct<number, any> = Uint(16);
export const Uint16LE: Struct<number, any> = Uint(16, {little_endian: true});
export const Uint16BE = Uint16;
export const Uint32: Struct<number, any> = Uint(32);
export const Uint32LE: Struct<number, any> = Uint(32, {little_endian: true});
export const Uint32BE = Uint32;
export const Uint64: Struct<number, any> = Uint(64);
export const Uint64LE: Struct<number, any> = Uint(64, {little_endian: true});
export const Uint64BE = Uint64;

export const Int8: Struct<number, any> = Int(8);
export const Int16: Struct<number, any> = Int(8);
export const Int16LE: Struct<number, any> = Int(16, {little_endian: true});
export const Int16BE = Int16;
export const Int32: Struct<number, any> = Int(32);
export const Int32LE: Struct<number, any> = Int(32, {little_endian: true});
export const Int32BE = Int32;

export const Float32: Struct<number, any> = Float(32);
export const Float32LE: Struct<number, any> = Float(32, {little_endian: true});
export const Float32BE = Float32;
export const Float64: Struct<number, any> = Float(64);
export const Float64LE: Struct<number, any> = Float(64, {little_endian: true});
export const Float64BE = Float64;

/** Noöp structure
 *
 * @type {Struct}
 */
export const Pass = Padding(0);
