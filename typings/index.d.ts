export { hex, hex_buffer } from './serialization';
export { Context_Array, Context_Map, Encoder, Decoder, inspect, Bits, Uint, Int, Float, Utf8, Embed, Byte_Array, Byte_Map, Byte_Buffer, Repeat, Branch, Padding } from './transcode';
import { Struct } from './transcode';
export declare const Uint8: Struct<{}>;
export declare const Uint16: Struct<{}>;
export declare const Uint16LE: Struct<{}>;
export declare const Uint32: Struct<{}>;
export declare const Uint32LE: Struct<{}>;
export declare const Uint64: Struct<{}>;
export declare const Uint64LE: Struct<{}>;
export declare const Int8: Struct<{}>;
export declare const Int16: Struct<{}>;
export declare const Int16LE: Struct<{}>;
export declare const Int32: Struct<{}>;
export declare const Int32LE: Struct<{}>;
export declare const Float32: Struct<{}>;
export declare const Float32LE: Struct<{}>;
export declare const Float64: Struct<{}>;
export declare const Float64LE: Struct<{}>;
/** Noöp structure
 *
 * @type {Struct}
 */
export declare const Pass: Struct<null>;
