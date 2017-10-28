
import {Bits, Uint, Int, Float, Utf8, Embed, Byte_Array, Byte_Map, Repeat} from '../src/transcode';

describe("Byte_Array parsing", () => {
    test("parse a single byte", () => {
        const data_view = new DataView(new Uint8Array([42]).buffer);
        const byte_array = Byte_Array({}, Uint(8));
        expect(byte_array.parse({data_view})).toEqual({data: [42], size: 1})
    });

    test("setting endianness various ways", () => {
        const now = Date.now();
        const lower = now % 2**32;
        const upper = Math.floor(now / 2**32);
        const data_view = new DataView(new Uint32Array([lower, upper]).buffer);
        const byte_array = Byte_Array({}, Uint(64));
        expect(byte_array.parse({data_view, little_endian: true})).toEqual({data: [now], size: 8});
        byte_array.little_endian = true;
        expect(byte_array.parse({data_view})).toEqual({data: [now], size: 8});
        byte_array.little_endian = undefined;
        byte_array[0] = Uint(64, {little_endian: true});
        expect(byte_array.parse({data_view})).toEqual({data: [now], size: 8});
    });

    test("embedded arrays", () => {
        const data_view = new DataView(new Uint8Array([0, 1, 2, 3]).buffer);
        const byte_array = Byte_Array({}, Uint(8), Embed(Byte_Array({}, Uint(8), Uint(8))), Uint(8));
        expect(byte_array.parse({data_view})).toEqual({data: [0, 1, 2, 3], size: 4});
    });

    test("repeat", () => {
        const data_view = new DataView(new Uint8Array([0, 1, 2, 3, 4]).buffer);
        const byte_array = Byte_Array({}, Uint(8), Repeat(3, {}, Uint(8)), Uint(8));
        expect(byte_array.parse({data_view})).toEqual({data: [0, [1, 2, 3], 4], size: 5});
    });
});
