export { hex, hex_buffer } from './serialization';
export { inspect, Parent, Bits, Uint, Int, Float, Utf8, Embed, Binary_Array, Binary_Map, Byte_Buffer, Repeat, Branch, Padding, } from './transcode';
import { Uint, Int, Float, Padding } from './transcode';
export const Uint8 = Uint(8);
export const Uint16 = Uint(16);
export const Uint16LE = Uint(16, { little_endian: true });
export const Uint16BE = Uint16;
export const Uint32 = Uint(32);
export const Uint32LE = Uint(32, { little_endian: true });
export const Uint32BE = Uint32;
export const Uint64 = Uint(64);
export const Uint64LE = Uint(64, { little_endian: true });
export const Uint64BE = Uint64;
export const Int8 = Int(8);
export const Int16 = Int(8);
export const Int16LE = Int(16, { little_endian: true });
export const Int16BE = Int16;
export const Int32 = Int(32);
export const Int32LE = Int(32, { little_endian: true });
export const Int32BE = Int32;
export const Float32 = Float(32);
export const Float32LE = Float(32, { little_endian: true });
export const Float32BE = Float32;
export const Float64 = Float(64);
export const Float64LE = Float(64, { little_endian: true });
export const Float64BE = Float64;
/** Noöp structure
 *
 * @type {Struct}
 */
export const Pass = Padding(0);
//# sourceMappingURL=index.js.map