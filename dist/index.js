export * from './transcode';
import { Uint, Int, Float } from './transcode';
export const Uint8 = (...args) => Uint(8, ...args);
export const Uint16 = (...args) => Uint(16, ...args);
export const Uint32 = (...args) => Uint(32, ...args);
export const Uint64 = (...args) => Uint(64, ...args);
export const Int8 = (...args) => Int(8, ...args);
export const Int16 = (...args) => Int(8, ...args);
export const Int32 = (...args) => Int(32, ...args);
export const Float32 = (...args) => Float(32, ...args);
export const Float64 = (...args) => Float(64, ...args);
//# sourceMappingURL=index.js.map