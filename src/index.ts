
export * from './transcode';

import {Uint, Int, Float} from './transcode';

export const Uint8 = (...args: any[]) => Uint(8, ...args);
export const Uint16 = (...args: any[]) => Uint(16, ...args);
export const Uint32 = (...args: any[]) => Uint(32, ...args);
export const Uint64 = (...args: any[]) => Uint(64, ...args);

export const Int8 = (...args: any[]) => Int(8, ...args);
export const Int16 = (...args: any[]) => Int(8, ...args);
export const Int32 = (...args: any[]) => Int(32, ...args);

export const Float32 = (...args: any[]) => Float(32, ...args);
export const Float64 = (...args: any[]) => Float(64, ...args);
