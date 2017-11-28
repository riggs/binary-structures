export {
    Context_Array,
    Context_Map,
    Encoder,
    Decoder,
    inspect,
    Bits,
    Uint,
    Int,
    Float,
    Utf8,
    Embed,
    Byte_Array,
    Byte_Map,
    Repeat,
    Branch
} from './transcode';

import {Uint, Int, Float, Struct, Transcoders} from './transcode';

export const Uint8 = (transcoders?: Transcoders<number>) => Uint(8, transcoders);
export const Uint16 = (transcoders?: Transcoders<number>) => Uint(16, transcoders);
export const Uint32 = (transcoders?: Transcoders<number>) => Uint(32, transcoders);
export const Uint64 = (transcoders?: Transcoders<number>) => Uint(64, transcoders);

export const Int8 = (transcoders?: Transcoders<number>) => Int(8, transcoders);
export const Int16 = (transcoders?: Transcoders<number>) => Int(8, transcoders);
export const Int32 = (transcoders?: Transcoders<number>) => Int(32, transcoders);

export const Float32 = (transcoders?: Transcoders<number>) => Float(32, transcoders);
export const Float64 = (transcoders?: Transcoders<number>) => Float(64, transcoders);
