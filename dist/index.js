export { inspect, Bits, Uint, Int, Float, Utf8, Embed, Byte_Array, Byte_Map, Repeat, Branch } from './transcode';
import { Uint, Int, Float } from './transcode';
export const Uint8 = (transcoders) => Uint(8, transcoders);
export const Uint16 = (transcoders) => Uint(16, transcoders);
export const Uint32 = (transcoders) => Uint(32, transcoders);
export const Uint64 = (transcoders) => Uint(64, transcoders);
export const Int8 = (transcoders) => Int(8, transcoders);
export const Int16 = (transcoders) => Int(8, transcoders);
export const Int32 = (transcoders) => Int(32, transcoders);
export const Float32 = (transcoders) => Float(32, transcoders);
export const Float64 = (transcoders) => Float(64, transcoders);
//# sourceMappingURL=index.js.map