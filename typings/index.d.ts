export { hex, hex_buffer } from './serialization';
export { Parented_Array, Parented_Map, Encoder, Decoder, inspect, Bits, Uint, Int, Float, Utf8, Embed, Binary_Array, Binary_Map, Byte_Buffer, Repeat, Branch, Padding } from './transcode';
import { Struct } from './transcode';
export declare const Uint8: Struct<number, number>;
export declare const Uint16: Struct<number, number>;
export declare const Uint16LE: Struct<number, number>;
export declare const Uint16BE: Struct<number, number>;
export declare const Uint32: Struct<number, number>;
export declare const Uint32LE: Struct<number, number>;
export declare const Uint32BE: Struct<number, number>;
export declare const Uint64: Struct<number, number>;
export declare const Uint64LE: Struct<number, number>;
export declare const Uint64BE: Struct<number, number>;
export declare const Int8: Struct<number, number>;
export declare const Int16: Struct<number, number>;
export declare const Int16LE: Struct<number, number>;
export declare const Int16BE: Struct<number, number>;
export declare const Int32: Struct<number, number>;
export declare const Int32LE: Struct<number, number>;
export declare const Int32BE: Struct<number, number>;
export declare const Float32: Struct<number, number>;
export declare const Float32LE: Struct<number, number>;
export declare const Float32BE: Struct<number, number>;
export declare const Float64: Struct<number, number>;
export declare const Float64LE: Struct<number, number>;
export declare const Float64BE: Struct<number, number>;
/** Noöp structure
 *
 * @type {Struct}
 */
export declare const Pass: Struct<{}, any>;
