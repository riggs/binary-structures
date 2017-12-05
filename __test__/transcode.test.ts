import 'improved_map';

import {
    SerializationError,
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
    Byte_Buffer,
    Repeat,
    Branch,
    Padding
} from '../src/transcode';

// TODO: Test packing with insufficient input data
// TODO: Test parsing with insufficient ArrayBuffer

describe("Bits", () => {
    test("simplest parse cases", () => {
        const data_view = new DataView(new Uint8Array([0xFF]).buffer);
        expect(Bits(1).parse(data_view)).toEqual({size: 1/8, data: 1});
        expect(Bits(2).parse(data_view)).toEqual({size: 2/8, data: 3});
        expect(Bits(3).parse(data_view)).toEqual({size: 3/8, data: 7});
        expect(Bits(4).parse(data_view)).toEqual({size: 4/8, data: 15});
        expect(Bits(5).parse(data_view)).toEqual({size: 5/8, data: 31});
        expect(Bits(6).parse(data_view)).toEqual({size: 6/8, data: 63});
        expect(Bits(7).parse(data_view)).toEqual({size: 7/8, data: 127});
    });
});
describe("Uint", () => {
    test("simplest parse cases", () => {
        const data_view = new DataView(new ArrayBuffer(4));
        data_view.setUint8(0, 6);
        expect(Uint(8).parse(data_view)).toEqual({data: 6, size: 1});
        data_view.setUint16(0, 8128);
        expect(Uint(16).parse(data_view)).toEqual({data: 8128, size: 2});
        data_view.setUint32(0, 33550336);
        expect(Uint(32).parse(data_view)).toEqual({data: 33550336, size: 4});
    });
    test("parsing endianness", () => {
        const data_view = new DataView(new ArrayBuffer(4));
        const little_endian = true;
        data_view.setUint16(0, 8128, little_endian);
        expect(Uint(16, {little_endian}).parse(data_view)).toEqual({data: 8128, size: 2});
        data_view.setUint32(0, 33550336, little_endian);
        expect(Uint(32).parse(data_view, {little_endian})).toEqual({data: 33550336, size: 4});
    });
    test("Uint64 parsing", () => {
        const now = Date.now();
        const lower = now % 2 ** 32;
        const upper = Math.floor(now / 2 ** 32);
        const data_view = new DataView(new Uint32Array([lower, upper]).buffer);
        expect(Uint(64, {little_endian: true}).parse(data_view)).toEqual({data: now, size: 8});
        data_view.setUint32(0, upper);
        data_view.setUint32(4, lower);
        expect(Uint(64).parse(data_view)).toEqual({data: now, size: 8});
    });
    describe("given data_view", () => {
        test("simplest pack case", () => {
            const data_view = new DataView(new ArrayBuffer(4));
            Uint(8).pack(6, {data_view});
            expect(data_view.getUint8(0)).toEqual(6);
            Uint(16).pack(8128, {data_view});
            expect(data_view.getUint16(0)).toEqual(8128);
            Uint(32).pack(33550336, {data_view});
            expect(data_view.getUint32(0)).toEqual(33550336);
        });
        test("packing endianness", () => {
            const data_view = new DataView(new ArrayBuffer(4));
            const little_endian = true;
            Uint(16, {little_endian}).pack(8128, {data_view});
            expect(data_view.getUint16(0, little_endian)).toEqual(8128);
            Uint(32).pack(33550336, {little_endian, data_view});
            expect(data_view.getUint32(0, little_endian)).toEqual(33550336);
        });
        test("Uint64 packing", () => {
            const now = Date.now();
            const lower = now % 2 ** 32;
            const upper = Math.floor(now / 2 ** 32);
            const data_view = new DataView(new ArrayBuffer(8));
            Uint(64, {little_endian: true}).pack(now, {data_view});
            expect(Array.from(new Uint32Array(data_view.buffer))).toEqual([lower, upper]);
            Uint(64).pack(now, {data_view});
            expect(data_view.getUint32(0)).toEqual(upper);
            expect(data_view.getUint32(4)).toEqual(lower);
        });
    });
    describe("without data_view given", () => {
        test("simplest pack case", () => {
            let size, buffer;
            ({size, buffer} = Uint(8).pack(6));
            expect(size).toEqual(1);
            expect(new DataView(buffer).getUint8(0)).toEqual(6);
            ({size, buffer} = Uint(16).pack(8128));
            expect(size).toEqual(2);
            expect(new DataView(buffer).getUint16(0)).toEqual(8128);
            ({size, buffer} = Uint(32).pack(33550336));
            expect(size).toEqual(4);
            expect(new DataView(buffer).getUint32(0)).toEqual(33550336);
        });
        test("packing endianness", () => {
            let size, buffer;
            const little_endian = true;
            ({size, buffer} = Uint(16, {little_endian}).pack(8128));
            expect(size).toEqual(2);
            expect(new DataView(buffer).getUint16(0, little_endian)).toEqual(8128);
            ({size, buffer} = Uint(32).pack(33550336, {little_endian}));
            expect(size).toEqual(4);
            expect(new DataView(buffer).getUint32(0, little_endian)).toEqual(33550336);
        });
        test("Uint64 packing", () => {
            let size, buffer;
            const now = Date.now();
            const lower = now % 2 ** 32;
            const upper = Math.floor(now / 2 ** 32);
            ({size, buffer} = Uint(64, {little_endian: true}).pack(now));
            expect(size).toEqual(8);
            expect(Array.from(new Uint32Array(buffer))).toEqual([lower, upper]);
            ({size, buffer} = Uint(64).pack(now));
            expect(size).toEqual(8);
            const data_view = new DataView(buffer);
            expect(data_view.getUint32(0)).toEqual(upper);
            expect(data_view.getUint32(4)).toEqual(lower);
        });
    });
});
describe("Branch", () => {
    describe("parsing", () => {
        test("simple case", () => {
            const data_view = new DataView(new Uint8Array([1, 0xAB, 0xCD]).buffer);
            const byte_array = Byte_Array(Uint(8), Branch((context: Context_Array) => context[0], {1: Uint(16, {little_endian: true}), 2: Uint(16)}));
            expect(byte_array.parse(data_view)).toEqual({data: [1, 0xCDAB], size: 3});
            data_view.setUint8(0, 2);
            expect(byte_array.parse(data_view)).toEqual({data: [2, 0xABCD], size: 3});
        });
        test("default value", () => {
            const data_view = new DataView(new Uint8Array([42, 0xAB, 0xCD]).buffer);
            const byte_array = Byte_Array(Uint(8), Branch((context: Context_Array) => context[0], {1: Uint(16, {little_endian: true})}, Uint(16)));
            expect(byte_array.parse(data_view)).toEqual({data: [42, 0xABCD], size: 3});
        });
        test("bad choice", () => {
            const data_view = new DataView(new Uint8Array([42, 0xAB, 0xCD]).buffer);
            const byte_array = Byte_Array(Uint(8), Branch((context: Context_Array) => context[0], {1: Uint(16, {little_endian: true}), 2: Uint(16)}));
            expect(() => byte_array.parse(data_view)).toThrow(SerializationError);
        });
    });
});
describe("Padding", () => {
    test("parsing", () => {
        const data_view = new DataView(new Uint8Array([1, 0, 0xAA]).buffer);
        const byte_array = Byte_Array(Uint(8), Padding({bytes: 1}), Uint(8));
        expect(byte_array.parse(data_view)).toEqual({data: [1, 0xAA], size: 3});
        byte_array[1] = Padding({bytes: 1, bits: 4});
        byte_array[2] = Bits(4);
        expect(byte_array.parse(data_view)).toEqual({data: [1, 0xA], size: 3});
    });
    describe("Packing", () => {
        describe("Given DataView", () => {

        });
        describe("Given no DataView", () => {
            test("bytes & bits", () => {
                const byte_array = Byte_Array(Uint(8), Padding({bytes: 1, bits: 4}), Bits(4), Uint(8));
                const {size, buffer} = byte_array.pack([1, 0xA, 2], );
                expect(size).toEqual(4);
                expect(Array.from(new Uint8Array(buffer))).toEqual([1, 0, 0xA0, 2]);
            });
        });
    });
});
describe("Byte_Array", () => {
    describe("Parsing", () => {
        test("parse a single byte", () => {
            const data_view = new DataView(new Uint8Array([42]).buffer);
            const byte_array = Byte_Array(Uint(8));
            expect(byte_array.parse(data_view)).toEqual({data: [42], size: 1})
        });
        test("setting endianness various ways", () => {
            const now = Date.now();
            const lower = now % 2 ** 32;
            const upper = Math.floor(now / 2 ** 32);
            const data_view = new DataView(new Uint32Array([lower, upper]).buffer);
            const byte_array = Byte_Array({little_endian: true}, Uint(64));
            expect(byte_array.parse(data_view)).toEqual({data: [now], size: 8});
            byte_array.little_endian = false;
            expect(byte_array.parse(data_view, {little_endian: true})).toEqual({data: [now], size: 8});
        });
        test("embedded arrays", () => {
            const data_view = new DataView(new Uint8Array([0, 1, 2, 3]).buffer);
            const byte_array = Byte_Array(Uint(8), Embed(Byte_Array(Uint(8), Uint(8))), Uint(8));
            expect(byte_array.parse(data_view)).toEqual({data: [0, 1, 2, 3], size: 4});
        });
        test("nested repeat", () => {
            const data_view = new DataView(new Uint8Array([0, 1, 2, 3, 4]).buffer);
            const byte_array = Byte_Array(Uint(8), Repeat(3, Uint(8)), Uint(8));
            expect(byte_array.parse(data_view)).toEqual({data: [0, [1, 2, 3], 4], size: 5});
        });
    });
    describe("Packing", () => {
        describe("Given DataView", () => {
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
            test("embed an array", () => {
                const byte_array = Byte_Array(Uint(8), Embed(Byte_Array(Uint(8), Uint(8))), Uint(8));
                const data_view = new DataView(new ArrayBuffer(4));
                const {size, buffer} = byte_array.pack([6, 28, 41, 127], {data_view});
                expect(size).toEqual(4);
                expect(Array.from(new Uint8Array(buffer))).toEqual([6, 28, 41, 127]);
            });
            test("pack some bits & bytes", () => {
                const byte_array = Byte_Array(Bits(2), Uint(8), Uint(8), Bits(6));
                const data_view = new DataView(new ArrayBuffer(3));
                const {size, buffer} = byte_array.pack([2, 170, 170, 42], {data_view});
                expect(size).toEqual(3);
                expect(Array.from(new Uint8Array(buffer))).toEqual([0xAA, 0xAA, 0xAA]);
            });
        });
        describe("Given no DataView", () => {
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
            test("embed an array", () => {
                const byte_array = Byte_Array(Uint(8), Embed(Byte_Array(Uint(8), Uint(8))), Uint(8));
                const {size, buffer} = byte_array.pack([6, 28, 41, 127]);
                expect(size).toEqual(4);
                expect(Array.from(new Uint8Array(buffer))).toEqual([6, 28, 41, 127]);
            });
            test("pack some bits & bytes", () => {
                const byte_array = Byte_Array(Bits(2), Uint(8), Uint(8), Bits(6));
                const {size, buffer} = byte_array.pack([2, 170, 170, 42]);
                expect(size).toEqual(3);
                expect(Array.from(new Uint8Array(buffer))).toEqual([0xAA, 0xAA, 0xAA]);
            });
        });
    });
    test("Byte_Array mutability as an array", () => {
        const array = [0, 1, 2];
        const data_view = new DataView(new Uint8Array(array).buffer);
        const byte_array = Byte_Array();
        expect(byte_array.parse(data_view)).toEqual({data: [], size: 0});
        byte_array.push(Uint(8));
        expect(byte_array.parse(data_view)).toEqual({data: [0], size: 1});
        byte_array.push(Uint(8), Uint(8));
        expect(byte_array.parse(data_view)).toEqual({data: [0, 1, 2], size: 3});
        byte_array.shift();
        byte_array.pop();
        expect(byte_array.parse(data_view)).toEqual({data: [0], size: 1});
        byte_array.push(Uint(16, {little_endian: true}));
        expect(byte_array.parse(data_view)).toEqual({data: [0, 0x0201], size: 3});
    });
});
describe("Repeat", () => {
    describe("Parsing", () => {
        test("simple case", () => {
            const data_view = new DataView(new Uint8Array([6, 5, 4, 3, 2, 1]).buffer);
            const repeat = Repeat(3, Uint(8), Uint(8));
            expect(repeat.parse(data_view)).toEqual({data: [6, 5, 4, 3, 2, 1], size: 6});
        });
    });
    describe("Packing", () => {
        test("Given DataView", () => {
            const array = [6, 5, 4, 3, 2, 1];
            const bytes = new Uint8Array(6);
            const data_view = new DataView(bytes.buffer);
            const repeat = Repeat(6, Uint(8));
            repeat.pack(array, {data_view});
            expect(Array.from(bytes)).toEqual(array);
        });
        test("Given no DataView", () => {
            const array = [6, 5, 4, 3, 2, 1];
            const repeat = Repeat(6, Uint(8));
            const {size, buffer} = repeat.pack(array);
            expect(size).toEqual(array.length);
            expect(Array.from(new Uint8Array(buffer))).toEqual(array);
        });
    });
});
describe("Byte_Map", () => {
    describe("Parsing", () => {
        const decode = <T>(data: Map<string, T>) => data.toObject();
        test("parse a byte", () => {
            const data_view = new DataView(new Uint8Array([42]).buffer);
            const byte_map = Byte_Map({decode}).set('a_byte', Uint(8));
            expect(byte_map.parse(data_view)).toEqual({data: {a_byte: 42}, size: 1});
        });
        test("setting endianness", () => {
            const now = Date.now();
            const lower = now % 2 ** 32;
            const upper = Math.floor(now / 2 ** 32);
            const data_view = new DataView(new Uint32Array([lower, upper]).buffer);
            const byte_map = Byte_Map({decode, little_endian: true}).set('now', Uint(64));
            expect(byte_map.parse(data_view)).toEqual({data: {now: now}, size: 8});
            byte_map.little_endian = undefined;
            byte_map.set('now', Uint(64, {little_endian: true}));
            expect(byte_map.parse(data_view)).toEqual({data: {now: now}, size: 8});
        });
        test("embedded maps", () => {
            const data_view = new DataView(new Uint8Array([0, 1, 2, 3]).buffer);
            const byte_map = Byte_Map({decode}).set('a', Uint(8)).set('embedded', Embed(Byte_Map().set('b', Uint(8)).set('c', Uint(8)))).set('d', Uint(8));
            expect(byte_map.parse(data_view)).toEqual({data: {a: 0, b: 1, c: 2, d: 3}, size: 4});
        });
    });
    describe("Packing", () => {
        describe("Given DataView", () => {
            test("pack a byte", () => {
                const byte_map = Byte_Map().set('one', Uint(8));
                const data_view = new DataView(new ArrayBuffer(1));
                byte_map.pack(new Map([['one', 42]]), {data_view});
                expect(data_view.getUint8(0)).toEqual(42);
            });
        });
        describe("Given no DataView", () => {

        });
    });
});
describe("Byte_Buffer", () => {
    describe("Parsing", () => {
        test("simple case", () => {
            const byte_buffer = Byte_Buffer(4);
            const data_view = new DataView(new Uint8Array([0, 1, 2, 3]).buffer);
            expect(byte_buffer.parse(data_view)).toEqual({data: data_view.buffer, size: 4})
        });
        test("in a Byte_Array", () => {
            const data_view = new DataView(new Uint8Array([0, 1, 2, 3, 4]).buffer);
            const byte_array = Byte_Array(Uint(8), Byte_Buffer((ctx: Context_Array) => ctx[0]!, {decode: (buffer) => Array.from(new Uint8Array(buffer))}))
            for (let i = 1; i < 5; i++) {
                data_view.setUint8(0, i);
                expect(byte_array.parse(data_view)).toEqual({data: [i, [1, 2, 3, 4].slice(0, i)], size: i + 1});
            }
        });
    });
    describe("Packing", () => {
        describe("Given DataView", () => {
            const array = new Uint8Array([1, 2, 3, 4]);
            const buffer = new ArrayBuffer(4);
            const data_view = new DataView(buffer);
            const byte_buffer = Byte_Buffer(4);
            byte_buffer.pack(array.buffer, {data_view});
            expect(Array.from(new Uint8Array(buffer))).toEqual(Array.from(array));
        });
        describe("Given no DataView", () => {
            const array = new Uint8Array([1, 2, 3, 4]);
            const byte_buffer = Byte_Buffer(4);
            const {size, buffer} = byte_buffer.pack(array.buffer);
            expect(size).toEqual(4)
            expect(Array.from(new Uint8Array(buffer))).toEqual(Array.from(array));
        });
    });
});
