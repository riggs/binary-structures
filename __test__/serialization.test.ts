
import {uint_pack, int_pack, float_pack, uint_parse, int_parse, float_parse, utf8_pack, utf8_parse} from '../src/serialization';

// TODO: Test invalid sizes

describe("uint_pack function", () => {
    test("pack a byte with a byte offset", () => {
        const bytes = new Uint8Array([0, 1, 2, 3]);
        const bit_length = uint_pack(0b00101010, {size: 8, byte_offset: 2, data_view: new DataView(bytes.buffer)});
        expect(bit_length).toEqual(8);
        expect(Array.from(bytes)).toEqual([0, 1, 42, 3]);
    });

    test("pack a uint16 little endian", () => {
        const buffer = new ArrayBuffer(2);
        const data_view = new DataView(buffer);
        const bit_length = uint_pack(0b0001111111000000, {size: 16, byte_offset: 0, data_view: data_view, little_endian: true});
        expect(bit_length).toEqual(16);
        expect(data_view.getUint16(0, true)).toEqual(8128);
    });

    test("pack a uint32 big endian", () => {
        const buffer = new ArrayBuffer(4);
        const data_view = new DataView(buffer);
        const bit_length = uint_pack(0b00000001111111111111000000000000, {size: 32, byte_offset: 0, data_view: data_view, little_endian: undefined});
        expect(bit_length).toEqual(32);
        expect(data_view.getUint32(0)).toEqual(33550336);
    });

    test("pack a uint64 little endian", () => {
        const buffer = new ArrayBuffer(8);
        const data_view = new DataView(buffer);
        const now = Date.now();
        const bit_length = uint_pack(now, {size: 64, byte_offset: 0, data_view: data_view, little_endian: true});
        expect(bit_length).toEqual(64);
        expect(data_view.getUint32(0, true)).toEqual(now % 2**32);
        expect(data_view.getUint32(4, true)).toEqual(Math.floor(now / 2**32));
    });

    test("pack a uint16 little endian with a bit offset", () => {
        const buffer = new ArrayBuffer(2+1);
        const data_view = new DataView(buffer);
        const bit_length = uint_pack(0xAF0F, {size: 16, byte_offset: 6/8, data_view: data_view, little_endian: true});
        expect(bit_length).toEqual(16);
        expect(Array.from(new Uint8Array(buffer))).toEqual([0b00101011, 0b11000011, 0b11000000].reverse());
    });

    test("pack a uint1 (bit1) with a bit offset", () =>{
        const buffer = new ArrayBuffer(1);
        const data_view = new DataView(buffer);
        const bit_offset = 7;
        const bit_length = uint_pack(1, {size: 1, byte_offset: bit_offset/8, data_view: data_view});
        expect(bit_length).toEqual(1);
        expect(data_view.getUint8(0)).toEqual(2**bit_offset);
    });

    test("pack a byte with a negative value throws an error", () => {
        expect(() => {uint_pack(-1, {size: 8, byte_offset: 0, data_view: new DataView(new ArrayBuffer(1))})})
            .toThrow(/Unable to encode/);
    });

    test("pack a uint16 with too large of a value throws an error", () => {
        expect(() => {uint_pack(33550336, {size: 16, byte_offset: 0, data_view: new DataView(new ArrayBuffer(2))})})
            .toThrow(/Unable to encode/);
    });

    test("pack a uint16 with not an integer throws an error", () => {
        expect(() => {uint_pack(42.42, {size: 16, byte_offset: 0, data_view: new DataView(new ArrayBuffer(2))})})
            .toThrow(/Unable to encode/);
    });

    test("pack a uint32 with an unsafe integer throws an error", () => {
        expect(() => {uint_pack(Number.MAX_SAFE_INTEGER + 1, {size: 32, byte_offset: 0, data_view: new DataView(new ArrayBuffer(4))})})
            .toThrow(/Unable to encode/);
    });
});

describe("int_pack function", () => {
    test("pack a byte with a byte offset", () => {
        const bytes = new Int8Array([0, 1, 2, 3]);
        const bit_length = int_pack(-42, {size: 8, byte_offset: 2, data_view: new DataView(bytes.buffer)});
        expect(bit_length).toEqual(8);
        expect(Array.from(bytes)).toEqual([0, 1, -42, 3]);
    });

    test("pack a uint16 little endian", () => {
        const buffer = new ArrayBuffer(2);
        const data_view = new DataView(buffer);
        const bit_length = int_pack(0b0001111111000000, {size: 16, byte_offset: 0, data_view: data_view, little_endian: true});
        expect(bit_length).toEqual(16);
        expect(data_view.getUint16(0, true)).toEqual(8128);
    });

    test("pack a uint32 big endian", () => {
        const buffer = new ArrayBuffer(4);
        const data_view = new DataView(buffer);
        const bit_length = int_pack(0b00000001111111111111000000000000, {size: 32, byte_offset: 0, data_view: data_view, little_endian: undefined});
        expect(bit_length).toEqual(32);
        expect(data_view.getUint32(0)).toEqual(33550336);
    });

    test("pack a uint16 little endian with a bit offset", () => {
        const buffer = new ArrayBuffer(2+1);
        const data_view = new DataView(buffer);
        const bit_length = int_pack(0x5F0F, {size: 16, byte_offset: 6/8, data_view: data_view, little_endian: true});
        expect(bit_length).toEqual(16);
        expect(Array.from(new Uint8Array(buffer))).toEqual([0b00010111, 0b11000011, 0b11000000].reverse());
    });

    test("pack a byte with too large of a negative value throws an error", () => {
        expect(() => {int_pack(-129, {size: 8, byte_offset: 0, data_view: new DataView(new ArrayBuffer(1))})})
            .toThrow(/Unable to encode/);
    });

    test("pack a int16 with too large of a value throws an error", () => {
        expect(() => {int_pack(65536, {size: 16, byte_offset: 0, data_view: new DataView(new ArrayBuffer(2))})})
            .toThrow(/Unable to encode/);
    });

    test("pack a int16 with not an integer throws an error", () => {
        expect(() => {int_pack(42.42, {size: 16, byte_offset: 0, data_view: new DataView(new ArrayBuffer(2))})})
            .toThrow(/Unable to encode/);
    });

});

describe("float_pack function", () => {
    test("pack a float64 little endian", () => {
        const buffer = new ArrayBuffer(8);
        const data_view = new DataView(buffer);
        const bit_length = float_pack(8128.8128, {size: 64, byte_offset: 0, data_view: data_view, little_endian: true});
        expect(bit_length).toEqual(64);
        expect(data_view.getFloat64(0, true)).toBeCloseTo(8128.8128);
    });

    test("pack a float32 big endian with a byte offset", () => {
        const bytes = new Float32Array([0.1, 0.2, 0.3, 0.4]);
        const data_view = new DataView(bytes.buffer);
        const bit_length = float_pack(-42.42, {size: 32, byte_offset: 8, data_view: data_view});
        expect(bit_length).toEqual(32);
        expect(data_view.getFloat32(8)).toBeCloseTo(-42.42);
    });

    test("pack a float32 little endian with a bit offset", () => {
        const buffer = new ArrayBuffer(5);
        const data_view = new DataView(buffer);
        const bit_offset = 3;
        const bit_length = float_pack(-41.41, {size: 32, byte_offset: bit_offset / 8, data_view: data_view, little_endian: true});
        expect(bit_length).toEqual(32);
        const tmp_buffer = new ArrayBuffer(5);
        const tmp_view = new DataView(tmp_buffer);
        tmp_view.setFloat32(0, -41.41, true);
        const tmp_value = tmp_view.getUint32(0, true);
        tmp_view.setUint8(4, Math.floor(tmp_value * 2**bit_offset / 2**32));
        tmp_view.setUint32(0, (tmp_value * 2**bit_offset) % 2**32, true);
        expect(Array.from(new Uint8Array(buffer))).toEqual(Array.from(new Uint8Array(tmp_buffer)));
    });
});

describe("uint_parse function", () => {
    test("parse a byte with a byte offset", () => {
        const bytes = new Uint8Array([0, 1, 42, 3]);
        expect(uint_parse({size: 8, byte_offset: 2, data_view: new DataView(bytes.buffer)}))
            .toEqual(42);
    });

    test("parse a uint16 little endian", () => {
        const buffer = new ArrayBuffer(2);
        const data_view = new DataView(buffer);
        data_view.setUint16(0,0b0001111111000000, true);
        expect(uint_parse({size: 16, byte_offset: 0, data_view: data_view, little_endian: true}))
            .toEqual(8128);
    });

    test("parse a uint32 big endian", () => {
        const buffer = new ArrayBuffer(4);
        const data_view = new DataView(buffer);
        data_view.setUint32(0, 0b00000001111111111111000000000000);
        expect(uint_parse({size: 32, byte_offset: 0, data_view: data_view, little_endian: undefined}))
            .toEqual(33550336);
    });

    test("parse a uint64 little endian", () => {
        const buffer = new ArrayBuffer(8);
        const data_view = new DataView(buffer);
        const now = Date.now();
        data_view.setUint32(0, now % 2**32, true);
        data_view.setUint32(4, Math.floor(now / 2**32), true);
        expect(uint_parse({size: 64, byte_offset: 0, data_view: data_view, little_endian: true}))
            .toEqual(now);
    });

    test("parse a uint16 big endian with a bit offset", () => {
        const buffer = new ArrayBuffer(2+1);
        const data_view = new DataView(buffer);
        const value = 0xAF0F;
        const bit_offset = 3;
        data_view.setUint8(0, (0xAF << bit_offset) & 0xFF);
        data_view.setUint8(1, (0xAF >> (8 - bit_offset)) | ((0x0F << bit_offset) & 0xFF));
        data_view.setUint8(2, (0x0F >> (8 - bit_offset)));
        expect(uint_parse({size: 16, byte_offset: bit_offset / 8, data_view: data_view}))
            .toEqual(value);
    });

    test("parse a uint2 with a bit shift without byte boundary", () => {
        const buffer = new ArrayBuffer(1);
        const data_view = new DataView(buffer);
        data_view.setUint8(0, 0xAA);
        expect(uint_parse({size: 2, byte_offset: 5/8, data_view: data_view}))
            .toEqual(1);
        expect(uint_parse({size: 2, byte_offset: 4/8, data_view: data_view}))
            .toEqual(2);
    });

    test("parse a uint3 with a bit shift with a byte boundary", () => {
        const buffer = new ArrayBuffer(2);
        const data_view = new DataView(buffer);
        data_view.setUint16(0, 0x01C0, true);
        expect(uint_parse({size: 3, byte_offset: 6/8, data_view: data_view}))
            .toEqual(7);
        expect(uint_parse({size: 3, byte_offset: 5/8, data_view: data_view}))
            .toEqual(6);
        expect(uint_parse({size: 3, byte_offset: 4/8, data_view: data_view}))
            .toEqual(4);
        expect(uint_parse({size: 3, byte_offset: 7/8, data_view: data_view}))
            .toEqual(3);
    });

    test("parse a uint64 with an unsafe integer throws an error", () => {
        const buffer = new Uint16Array([0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF]).buffer;
        const data_view = new DataView(buffer);
        expect(() => {uint_parse({size: 64, byte_offset: 0, data_view: data_view})})
            .toThrow(/0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF/)
    })
});

describe("int_parse function", () => {
    test("parse a byte with a byte offset", () => {
        const bytes = new Int8Array([0, 1, -42, 3]);
        expect(int_parse({size: 8, byte_offset: 2, data_view: new DataView(bytes.buffer)}))
            .toEqual(-42);
    });

    test("parse a int16 little endian", () => {
        const buffer = new ArrayBuffer(2);
        const data_view = new DataView(buffer);
        data_view.setUint16(0,0b0001111111000000, true);
        expect(int_parse({size: 16, byte_offset: 0, data_view: data_view, little_endian: true}))
            .toEqual(8128);
    });

    test("parse a int32 big endian", () => {
        const buffer = new ArrayBuffer(4);
        const data_view = new DataView(buffer);
        data_view.setInt32(0, -33550336);
        expect(int_parse({size: 32, byte_offset: 0, data_view: data_view, little_endian: undefined}))
            .toEqual(-33550336);
    });

    test("parse a int16 big endian with a bit offset", () => {
        const buffer = new ArrayBuffer(2+1);
        const data_view = new DataView(buffer);
        const value = 0xAF0F;
        const bit_offset = 3;
        data_view.setUint8(0, (0xAF << bit_offset) & 0xFF);
        data_view.setUint8(1, (0xAF >> (8 - bit_offset)) | ((0x0F << bit_offset) & 0xFF));
        data_view.setUint8(2, (0x0F >> (8 - bit_offset)));
        expect(int_parse({size: 16, byte_offset: bit_offset / 8, data_view: data_view}))
            .toEqual(-(2**16 - value));
    });
});

describe("float_parse function", () => {
    test("parse a float64 big endian", () => {
        const buffer = new ArrayBuffer(8);
        const data_view = new DataView(buffer);
        data_view.setFloat64(0, 8128.8128);
        expect(float_parse({size: 64, byte_offset: 0, data_view: data_view}))
            .toBeCloseTo(8128.8128);
    });

    test("parse a float32 little endian with a byte offset", () => {
        const bytes = new Float32Array([0.1, 0.2, -42.42, 0.4]);
        expect(float_parse({size: 32, byte_offset: 8, data_view: new DataView(bytes.buffer), little_endian: true}))
            .toBeCloseTo(-42.42);
    });

    test("parse a float32 big endian with a bit offset", () => {
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
        expect(float_parse({size: 32, byte_offset: bit_offset / 8, data_view: data_view}))
            .toBeCloseTo(value);
    });
});

describe("utf8_pack function", () => {
    test("pack an unsized string with a byte offset", () => {
        const buffer = new ArrayBuffer(8);
        const data_view = new DataView(buffer);
        const bit_length = utf8_pack('💩', {size: 0, byte_offset: 3, data_view});
        expect(bit_length).toEqual(32);
        expect(Array.from(new Uint8Array(buffer))).toEqual([0, 0, 0, 240, 159, 146, 169, 0]);
    });

    test("pack a string with a bit offset (but, really, don't do this in practice)", () => {
        const value = '🚲';
        const buffer = new ArrayBuffer(5);
        const data_view = new DataView(buffer);
        const bit_offset = 3;
        const bit_length = utf8_pack(value, {size: 32, byte_offset: bit_offset / 8, data_view: data_view});
        expect(bit_length).toEqual(32);
        const tmp_buffer = new ArrayBuffer(5);
        const tmp_view = new DataView(tmp_buffer);
        const tmp_value = new DataView(new TextEncoder().encode(value).buffer).getUint32(0, true);
        tmp_view.setUint8(4, Math.floor(tmp_value * 2**bit_offset / 2**32));
        tmp_view.setUint32(0, (tmp_value * 2**bit_offset) % 2**32, true);
        expect(Array.from(new Uint8Array(buffer))).toEqual(Array.from(new Uint8Array(tmp_buffer)));
    });

    test("pack a string with a too short of size for string serialization throws an error", () => {
        expect(() => {utf8_pack('🚲', {size: 16, byte_offset: 0, data_view: new DataView(new ArrayBuffer(4))})})
            .toThrow(/Input string serializes to longer than/)
    });

    test("pack a string with an offset that won't fit in the buffer throws an error", () => {
        expect(() => {utf8_pack('🚲', {size: 0, byte_offset: 2, data_view: new DataView(new ArrayBuffer(4))})})
            .toThrow(/Insufficient space in ArrayBuffer/)
    });
});

describe("utf8_parse function", () => {
    test("parse a string with a byte offset", () => {
        const buffer = new Uint8Array([0, 0, 0, 240, 159, 146, 169, 0]).buffer;
        const data_view = new DataView(buffer);
        expect(utf8_parse({size: 32, byte_offset: 3, data_view: data_view}))
            .toEqual('💩');
    });

    test("parse a string with a bit offset (but, really, don't do this in practice)", () => {
        const buffer = new ArrayBuffer(5);
        const data_view = new DataView(buffer);
        const tmp_buffer = new TextEncoder().encode('🚲').buffer;
        const bytes = new Uint8Array(tmp_buffer);
        const bit_offset = 3;
        data_view.setUint8(0, (bytes[0] << bit_offset) & 0xFF);
        data_view.setUint8(1, (bytes[0] >> (8 - bit_offset)) | ((bytes[1] << bit_offset) & 0xFF));
        data_view.setUint8(2, (bytes[1] >> (8 - bit_offset)) | ((bytes[2] << bit_offset) & 0xFF));
        data_view.setUint8(3, (bytes[2] >> (8 - bit_offset)) | ((bytes[3] << bit_offset) & 0xFF));
        data_view.setUint8(4, (bytes[3] >> (8 - bit_offset)));
        expect(utf8_parse({size: 32, byte_offset: bit_offset / 8, data_view: data_view}))
            .toEqual('🚲');
    });
});
