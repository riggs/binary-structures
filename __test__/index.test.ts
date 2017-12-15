import 'improved-map';

import {
    Uint8,
    Uint16,
    Uint16LE,
    Uint16BE,
    Uint32,
    Uint32LE,
    Uint32BE,
    Uint64,
    Uint64LE,
    Uint64BE,
    Int8,
    Int16,
    Int16LE,
    Int16BE,
    Int32,
    Int32LE,
    Int32BE,
    Float32,
    Float32LE,
    Float32BE,
    Float64,
    Float64LE,
    Float64BE,
    Pass
} from '../src/index';

// TODO
describe("type aliases", () => {
    describe("Uint8", () => {
        test("parse", () => {
            expect(Uint8.parse(new DataView(new Uint8Array([42]).buffer))).toEqual({size: 1, data: 42})
        });
    });
});
