
import {uint_pack, int_pack, float_pack, uint_unpack, int_unpack, float_unpack} from './serialization';

describe("uint_pack function", () => {
    test("pack a byte with a byte offset", () => {
        const bytes = new Uint8Array([0, 1, 2, 3]);
        uint_pack(0b00101010, {size: 8, byte_offset: 2, bit_offset: 0, data_view: new DataView(bytes.buffer)});
        expect(Array.from(bytes)).toEqual([0, 1, 42, 3]);
    });

    test("pack a uint16 little endian", () => {
        const buffer = new ArrayBuffer(2);
        const data_view = new DataView(buffer);
        uint_pack(0b0001111111000000, {size: 16, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: true});
        expect(data_view.getUint16(0, true)).toEqual(8128);
    });

    test("pack a uint32 big endian", () => {
        const buffer = new ArrayBuffer(4);
        const data_view = new DataView(buffer);
        uint_pack(0b00000001111111111111000000000000, {size: 32, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: undefined});
        expect(data_view.getUint32(0)).toEqual(33550336);
    });

    test("pack a uint64 little endian", () => {
        const buffer = new ArrayBuffer(8);
        const data_view = new DataView(buffer);
        const now = Date.now();
        uint_pack(now, {size: 64, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: true});
        expect(data_view.getUint32(0, true)).toEqual(now % 2**32);
        expect(data_view.getUint32(4, true)).toEqual(Math.floor(now / 2**32));
    });

    test("pack a uint16 little endian with a bit offset", () => {
        const buffer = new ArrayBuffer(2+1);
        const data_view = new DataView(buffer);
        uint_pack(0xAF0F, {size: 16, byte_offset: 0, bit_offset: 6, data_view: data_view, little_endian: true});
        expect(Array.from(new Uint8Array(buffer))).toEqual([0b00101011, 0b11000011, 0b11000000].reverse());
    });

    test("pack a uint1 (bit1) with a bit offset", () =>{
        const buffer = new ArrayBuffer(1);
        const data_view = new DataView(buffer);
        const bit_offset = 7;
        uint_pack(1, {size: 1, byte_offset: 0, bit_offset: bit_offset, data_view: data_view});
        expect(data_view.getUint8(0)).toEqual(2**bit_offset);
    });

    test("pack a byte with a negative value throws an error", () => {
        expect(() => {uint_pack(-1, {size: 8, byte_offset: 0, bit_offset: 0, data_view: new DataView(new ArrayBuffer(1))})})
            .toThrow(/Unable to encode/);
    });

    test("pack a uint16 with too large of a value throws an error", () => {
        expect(() => {uint_pack(33550336, {size: 16, byte_offset: 0, bit_offset: 0, data_view: new DataView(new ArrayBuffer(2))})})
            .toThrow(/Unable to encode/);
    });

    test("pack a uint16 with not an integer throws an error", () => {
        expect(() => {uint_pack(42.42, {size: 16, byte_offset: 0, bit_offset: 0, data_view: new DataView(new ArrayBuffer(2))})})
            .toThrow(/Unable to encode/);
    });

    test("pack a uint32 with an unsafe integer throws an error", () => {
        expect(() => {uint_pack(Number.MAX_SAFE_INTEGER + 1, {size: 32, byte_offset: 0, bit_offset: 0, data_view: new DataView(new ArrayBuffer(4))})})
            .toThrow(/Unable to encode/);
    });
});

describe("int_pack function", () => {
    test("pack a byte with a byte offset", () => {
        const bytes = new Int8Array([0, 1, 2, 3]);
        int_pack(-42, {size: 8, byte_offset: 2, bit_offset: 0, data_view: new DataView(bytes.buffer)});
        expect(Array.from(bytes)).toEqual([0, 1, -42, 3]);
    });

    test("pack a uint16 little endian", () => {
        const buffer = new ArrayBuffer(2);
        const data_view = new DataView(buffer);
        int_pack(0b0001111111000000, {size: 16, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: true});
        expect(data_view.getUint16(0, true)).toEqual(8128);
    });

    test("pack a uint32 big endian", () => {
        const buffer = new ArrayBuffer(4);
        const data_view = new DataView(buffer);
        int_pack(0b00000001111111111111000000000000, {size: 32, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: undefined});
        expect(data_view.getUint32(0)).toEqual(33550336);
    });

    test("pack a uint16 little endian with a bit offset", () => {
        const buffer = new ArrayBuffer(2+1);
        const data_view = new DataView(buffer);
        int_pack(0x5F0F, {size: 16, byte_offset: 0, bit_offset: 6, data_view: data_view, little_endian: true});
        expect(Array.from(new Uint8Array(buffer))).toEqual([0b00010111, 0b11000011, 0b11000000].reverse());
    });

    test("pack a byte with too large of a negative value throws an error", () => {
        expect(() => {int_pack(-129, {size: 8, byte_offset: 0, bit_offset: 0, data_view: new DataView(new ArrayBuffer(1))})})
            .toThrow(/Unable to encode/);
    });

    test("pack a int16 with too large of a value throws an error", () => {
        expect(() => {int_pack(65536, {size: 16, byte_offset: 0, bit_offset: 0, data_view: new DataView(new ArrayBuffer(2))})})
            .toThrow(/Unable to encode/);
    });

    test("pack a int16 with not an integer throws an error", () => {
        expect(() => {int_pack(42.42, {size: 16, byte_offset: 0, bit_offset: 0, data_view: new DataView(new ArrayBuffer(2))})})
            .toThrow(/Unable to encode/);
    });

});

describe("float_pack function", () => {
    test("pack a float64 little endian", () => {
        const buffer = new ArrayBuffer(8);
        const data_view = new DataView(buffer);
        float_pack(8128.8128, {size: 64, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: true});
        expect(data_view.getFloat64(0, true)).toBeCloseTo(8128.8128);
    });

    test("pack a float32 big endian with a byte offset", () => {
        const bytes = new Float32Array([0.1, 0.2, 0.3, 0.4]);
        const data_view = new DataView(bytes.buffer);
        float_pack(-42.42, {size: 32, byte_offset: 8, bit_offset: 0, data_view: data_view});
        expect(data_view.getFloat32(8)).toBeCloseTo(-42.42);
    });

    test("pack a float32 little endian with a bit offset", () => {
        const buffer = new ArrayBuffer(5);
        const data_view = new DataView(buffer);
        const bit_offset = 3;
        float_pack(-41.41, {size: 32, byte_offset: 0, bit_offset: bit_offset, data_view: data_view, little_endian: true});
        const tmp_buffer = new ArrayBuffer(5);
        const tmp_view = new DataView(tmp_buffer);
        tmp_view.setFloat32(0, -41.41, true);
        const tmp_value = tmp_view.getUint32(0, true);
        tmp_view.setUint8(4, Math.floor(tmp_value * 2**bit_offset / 2**32));
        tmp_view.setUint32(0, (tmp_value * 2**bit_offset) % 2**32, true);
        expect(Array.from(new Uint8Array(buffer))).toEqual(Array.from(new Uint8Array(tmp_buffer)));
    });
});

describe("uint_unpack function", () => {
    test("unpack a byte with a byte offset", () => {
        const bytes = new Uint8Array([0, 1, 42, 3]);
        expect(uint_unpack({size: 8, byte_offset: 2, bit_offset: 0, data_view: new DataView(bytes.buffer)}))
            .toEqual(42);
    });

    test("unpack a uint16 little endian", () => {
        const buffer = new ArrayBuffer(2);
        const data_view = new DataView(buffer);
        data_view.setUint16(0,0b0001111111000000, true);
        expect(uint_unpack({size: 16, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: true}))
            .toEqual(8128);
    });

    test("unpack a uint32 big endian", () => {
        const buffer = new ArrayBuffer(4);
        const data_view = new DataView(buffer);
        data_view.setUint32(0, 0b00000001111111111111000000000000);
        expect(uint_unpack({size: 32, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: undefined}))
            .toEqual(33550336);
    });

    test("unpack a uint64 little endian", () => {
        const buffer = new ArrayBuffer(8);
        const data_view = new DataView(buffer);
        const now = Date.now();
        data_view.setUint32(0, now % 2**32, true);
        data_view.setUint32(4, Math.floor(now / 2**32), true);
        expect(uint_unpack({size: 64, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: true}))
            .toEqual(now);
    });

    test("unpack a uint16 big endian with a bit offset", () => {
        const buffer = new ArrayBuffer(2+1);
        const data_view = new DataView(buffer);
        const value = 0xAF0F;
        const bit_offset = 3;
        data_view.setUint8(0, (0xAF << bit_offset) & 0xFF);
        data_view.setUint8(1, (0xAF >> (8 - bit_offset)) | ((0x0F << bit_offset) & 0xFF));
        data_view.setUint8(2, (0x0F >> (8 - bit_offset)));
        expect(uint_unpack({size: 16, byte_offset: 0, bit_offset: bit_offset, data_view: data_view}))
            .toEqual(value);
    });

    test("unpack a uint2 with a bit shift without byte boundary", () => {
        const buffer = new ArrayBuffer(1);
        const data_view = new DataView(buffer);
        data_view.setUint8(0, 0xAA);
        expect(uint_unpack({size: 2, byte_offset: 0, bit_offset: 5, data_view: data_view}))
            .toEqual(1);
        expect(uint_unpack({size: 2, byte_offset: 0, bit_offset: 4, data_view: data_view}))
            .toEqual(2);
    });

    test("unpack a uint3 with a bit shift with a byte boundary", () => {
        const buffer = new ArrayBuffer(2);
        const data_view = new DataView(buffer);
        data_view.setUint16(0, 0x01C0, true);
        expect(uint_unpack({size: 3, byte_offset: 0, bit_offset: 6, data_view: data_view}))
            .toEqual(7);
        expect(uint_unpack({size: 3, byte_offset: 0, bit_offset: 5, data_view: data_view}))
            .toEqual(6);
        expect(uint_unpack({size: 3, byte_offset: 0, bit_offset: 4, data_view: data_view}))
            .toEqual(4);
        expect(uint_unpack({size: 3, byte_offset: 0, bit_offset: 7, data_view: data_view}))
            .toEqual(3);
    });

    test("unpack a uint64 with an unsafe integer throws an error", () => {
        const buffer = new Uint16Array([0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF]).buffer;
        const data_view = new DataView(buffer);
        expect(() => {uint_unpack({size: 64, byte_offset: 0, bit_offset: 0, data_view: data_view})})
            .toThrow(/0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF/)
    })
});

describe("int_unpack function", () => {
    test("unpack a byte with a byte offset", () => {
        const bytes = new Int8Array([0, 1, -42, 3]);
        expect(int_unpack({size: 8, byte_offset: 2, bit_offset: 0, data_view: new DataView(bytes.buffer)}))
            .toEqual(-42);
    });

    test("unpack a int16 little endian", () => {
        const buffer = new ArrayBuffer(2);
        const data_view = new DataView(buffer);
        data_view.setUint16(0,0b0001111111000000, true);
        expect(int_unpack({size: 16, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: true}))
            .toEqual(8128);
    });

    test("unpack a int32 big endian", () => {
        const buffer = new ArrayBuffer(4);
        const data_view = new DataView(buffer);
        data_view.setInt32(0, -33550336);
        expect(int_unpack({size: 32, byte_offset: 0, bit_offset: 0, data_view: data_view, little_endian: undefined}))
            .toEqual(-33550336);
    });

    test("unpack a int16 big endian with a bit offset", () => {
        const buffer = new ArrayBuffer(2+1);
        const data_view = new DataView(buffer);
        const value = 0xAF0F;
        const bit_offset = 3;
        data_view.setUint8(0, (0xAF << bit_offset) & 0xFF);
        data_view.setUint8(1, (0xAF >> (8 - bit_offset)) | ((0x0F << bit_offset) & 0xFF));
        data_view.setUint8(2, (0x0F >> (8 - bit_offset)));
        expect(int_unpack({size: 16, byte_offset: 0, bit_offset: bit_offset, data_view: data_view}))
            .toEqual(-(2**16 - value));
    });
});

describe("float_unpack function", () => {
    test("unpack a float64 big endian", () => {
        const buffer = new ArrayBuffer(8);
        const data_view = new DataView(buffer);
        data_view.setFloat64(0, 8128.8128);
        expect(float_unpack({size: 64, byte_offset: 0, bit_offset: 0, data_view: data_view}))
            .toBeCloseTo(8128.8128);
    });

    test("unpack a float32 little endian with a byte offset", () => {
        const bytes = new Float32Array([0.1, 0.2, -42.42, 0.4]);
        expect(float_unpack({size: 32, byte_offset: 8, bit_offset: 0, data_view: new DataView(bytes.buffer), little_endian: true}))
            .toBeCloseTo(-42.42);
    });

    test("unpack a float32 big endian with a bit offset", () => {
        const buffer = new ArrayBuffer(4+1);
        const data_view = new DataView(buffer);
        const value = -41.41;
        const tmp_buffer = new ArrayBuffer(4);
        new DataView(tmp_buffer).setFloat32(0, value);
        const bytes = new Uint8Array(tmp_buffer);
        const bit_offset = 3;
        data_view.setUint8(0, (bytes[0] << bit_offset) & 0xFF);
        data_view.setUint8(1, (bytes[0] >> (8 - bit_offset)) | ((bytes[1] << bit_offset) & 0xFF));
        data_view.setUint8(2, (bytes[1] >> (8 - bit_offset)) | ((bytes[2] << bit_offset) & 0xFF));
        data_view.setUint8(3, (bytes[2] >> (8 - bit_offset)) | ((bytes[3] << bit_offset) & 0xFF));
        data_view.setUint8(4, (bytes[3] >> (8 - bit_offset)));
        expect(float_unpack({size: 32, byte_offset: 0, bit_offset: bit_offset, data_view: data_view}))
            .toBeCloseTo(value);
    });
});
