export { hex, hex_buffer } from './serialization';
export { Context_Array, Context_Map, Encoder, Decoder, inspect, Bits, Uint, Int, Float, Utf8, Embed, Binary_Array, Byte_Array_Class, Binary_Map, Byte_Map_Class, Byte_Buffer, Repeat, Branch, Padding } from './transcode';
import { Struct } from './transcode';
export declare const Uint8: Struct<number>;
export declare const Uint16: Struct<number>;
export declare const Uint16LE: Struct<number>;
export declare const Uint16BE: Struct<number>;
export declare const Uint32: Struct<number>;
export declare const Uint32LE: Struct<number>;
export declare const Uint32BE: Struct<number>;
export declare const Uint64: Struct<number>;
export declare const Uint64LE: Struct<number>;
export declare const Uint64BE: Struct<number>;
export declare const Int8: Struct<number>;
export declare const Int16: Struct<number>;
export declare const Int16LE: Struct<number>;
export declare const Int16BE: Struct<number>;
export declare const Int32: Struct<number>;
export declare const Int32LE: Struct<number>;
export declare const Int32BE: Struct<number>;
export declare const Float32: Struct<number>;
export declare const Float32LE: Struct<number>;
export declare const Float32BE: Struct<number>;
export declare const Float64: Struct<number>;
export declare const Float64LE: Struct<number>;
export declare const Float64BE: Struct<number>;
/** Noöp structure
 *
 * @type {Struct}
 */
export declare const Pass: Struct<null>;
