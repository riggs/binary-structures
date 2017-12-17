export { hex, hex_buffer } from './serialization';
export { Encoded, Encoded_Map, Encoded_Array, Context_Array, Context_Map, Encoder, Decoder, inspect, Parent, Bits, Uint, Int, Float, Utf8, Embed, Binary_Array, Binary_Map, Byte_Buffer, Repeat, Branch, Padding, Primitive } from './transcode';
import { Struct } from './transcode';
export declare const Uint8: Struct<number, any>;
export declare const Uint16: Struct<number, any>;
export declare const Uint16LE: Struct<number, any>;
export declare const Uint16BE: Struct<number, any>;
export declare const Uint32: Struct<number, any>;
export declare const Uint32LE: Struct<number, any>;
export declare const Uint32BE: Struct<number, any>;
export declare const Uint64: Struct<number, any>;
export declare const Uint64LE: Struct<number, any>;
export declare const Uint64BE: Struct<number, any>;
export declare const Int8: Struct<number, any>;
export declare const Int16: Struct<number, any>;
export declare const Int16LE: Struct<number, any>;
export declare const Int16BE: Struct<number, any>;
export declare const Int32: Struct<number, any>;
export declare const Int32LE: Struct<number, any>;
export declare const Int32BE: Struct<number, any>;
export declare const Float32: Struct<number, any>;
export declare const Float32LE: Struct<number, any>;
export declare const Float32BE: Struct<number, any>;
export declare const Float64: Struct<number, any>;
export declare const Float64LE: Struct<number, any>;
export declare const Float64BE: Struct<number, any>;
/** Noöp structure
 *
 * @type {Struct}
 */
export declare const Pass: Struct<any, {}>;
