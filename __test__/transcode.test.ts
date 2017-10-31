import {inspect, Bits, Uint, Int, Float, Utf8, Embed, Byte_Array, Byte_Map, Repeat, Branch} from '../src/transcode';

describe("Bits", () => {
    test("simplest parse cases", () => {
        const data_view = new DataView(new Uint8Array([0xFF]).buffer);
        expect(Bits(1).parse({data_view})).toEqual({size: 1/8, data: 1});
        expect(Bits(2).parse({data_view})).toEqual({size: 2/8, data: 3});
        expect(Bits(3).parse({data_view})).toEqual({size: 3/8, data: 7});
        expect(Bits(4).parse({data_view})).toEqual({size: 4/8, data: 15});
        expect(Bits(5).parse({data_view})).toEqual({size: 5/8, data: 31});
        expect(Bits(6).parse({data_view})).toEqual({size: 6/8, data: 63});
        expect(Bits(7).parse({data_view})).toEqual({size: 7/8, data: 127});
    });
});
describe("Uint", () => {
    test("simplest parse cases", () => {

    });
});
describe("Branch", () => {
    test("branch.parse", () => {

    });
});
describe("Byte_Array parsing", () => {
    test("parse a single byte", () => {
        const data_view = new DataView(new Uint8Array([42]).buffer);
        const byte_array = Byte_Array(Uint(8));
        expect(byte_array.parse({data_view})).toEqual({data: [42], size: 1})
    });
    test("setting endianness various ways", () => {
        const now = Date.now();
        const lower = now % 2**32;
        const upper = Math.floor(now / 2**32);
        const data_view = new DataView(new Uint32Array([lower, upper]).buffer);
        const byte_array = Byte_Array({little_endian: true}, Uint(64));
        expect(byte_array.parse({data_view})).toEqual({data: [now], size: 8});
        byte_array.little_endian = undefined;
        byte_array[0] = Uint(64, {little_endian: true});
        expect(byte_array.parse({data_view})).toEqual({data: [now], size: 8});
    });
    test("embedded arrays", () => {
        const data_view = new DataView(new Uint8Array([0, 1, 2, 3]).buffer);
        const byte_array = Byte_Array(Uint(8), Embed(Byte_Array(Uint(8), Uint(8))), Uint(8));
        expect(byte_array.parse({data_view})).toEqual({data: [0, 1, 2, 3], size: 4});
    });
    test("repeat", () => {
        const data_view = new DataView(new Uint8Array([0, 1, 2, 3, 4]).buffer);
        const byte_array = Byte_Array(Uint(8), Repeat(3, {}, Uint(8)), Uint(8));
        expect(byte_array.parse({data_view})).toEqual({data: [0, [1, 2, 3], 4], size: 5});
    });
});
describe("Byte_Array packing", () => {
    describe("with a given Data View", () => {
        test("pack some bytes", () => {
            const byte_array = Byte_Array(Uint(8), Uint(8), Uint(8));
            const data_view = new DataView(new ArrayBuffer(3));
            const {size, buffer} = byte_array.pack([41, 42, 170], {data_view});
            expect(size).toEqual(3);
            expect(Array.from(new Uint8Array(buffer))).toEqual([41, 42, 170]);
        });
        test("nest an array", () => {
            const byte_array = Byte_Array(Uint(8), Byte_Array(Uint(8), Uint(8)), Uint(8));
            const data_view = new DataView(new ArrayBuffer(4));
            const {size, buffer} = byte_array.pack([1, [11, 12], 3], {data_view});
            expect(size).toEqual(4);
            expect(Array.from(new Uint8Array(buffer))).toEqual([1, 11, 12, 3]);
        });
        test("pack some bits & bytes", () => {
            const byte_array = Byte_Array(Bits(2), Uint(8), Uint(8), Bits(6));
            const data_view = new DataView(new ArrayBuffer(3));
            const {size, buffer} = byte_array.pack([2, 170, 170, 42], {data_view});
            expect(size).toEqual(3);
            expect(Array.from(new Uint8Array(buffer))).toEqual([0xAA, 0xAA, 0xAA]);
        });
    });
    describe("without a given Data View", () => {
        test("pack some bytes", () => {
            const byte_array = Byte_Array(Uint(8), Uint(8), Uint(8));
            const {size, buffer} = byte_array.pack([41, 42, 170]);
            expect(size).toEqual(3);
            expect(Array.from(new Uint8Array(buffer))).toEqual([41, 42, 170]);
        });
        test("nest an array", () => {
            const byte_array = Byte_Array(Uint(8), Byte_Array(Uint(8), Uint(8)), Uint(8));
            const {size, buffer} = byte_array.pack([1, [11, 12], 3]);
            expect(size).toEqual(4);
            expect(Array.from(new Uint8Array(buffer))).toEqual([1, 11, 12, 3]);
        });
        test("pack some bits & bytes", () => {
            const byte_array = Byte_Array(Bits(2), Uint(8), Uint(8), Bits(6));
            const {size, buffer} = byte_array.pack([2, 170, 170, 42]);
            expect(size).toEqual(3);
            expect(Array.from(new Uint8Array(buffer))).toEqual([0xAA, 0xAA, 0xAA]);
        });
    });
});
describe("Byte_Map parsing", () => {
    test("parse a byte", () => {
        const data_view = new DataView(new Uint8Array([42]).buffer);
        const byte_map = Byte_Map().set('a_byte', Uint(8));
        expect(byte_map.parse({data_view})).toEqual({data: {a_byte: 42}, size: 1});
    });
    test("setting endianness", () => {
        const now = Date.now();
        const lower = now % 2**32;
        const upper = Math.floor(now / 2**32);
        const data_view = new DataView(new Uint32Array([lower, upper]).buffer);
        const byte_map = Byte_Map({little_endian: true}).set('now', Uint(64));
        expect(byte_map.parse({data_view})).toEqual({data: {now: now}, size: 8});
        byte_map.little_endian = undefined;
        byte_map.set('now', Uint(64, {little_endian: true}));
        expect(byte_map.parse({data_view})).toEqual({data: {now: now}, size: 8});
    });
    test("embedded maps", () => {
        const data_view = new DataView(new Uint8Array([0, 1, 2, 3]).buffer);
        const byte_map = Byte_Map().set('a', Uint(8)).set('embedded', Embed(Byte_Map().set('b', Uint(8)).set('c', Uint(8)))).set('d', Uint(8));
        expect(byte_map.parse({data_view})).toEqual({data: {a: 0, b: 1, c: 2, d: 3}, size: 4});
    });
});
