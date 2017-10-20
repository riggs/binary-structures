
import {uint_pack, uint_unpack} from './bytes';

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

    test("unpack a uint64 with an unsafe integer throws an error", () => {
        const buffer = new Uint16Array([0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF]).buffer;
        const data_view = new DataView(buffer);
        expect(() => {uint_unpack({size: 64, byte_offset: 0, bit_offset: 0, data_view: data_view})})
            .toThrow(/0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF/)
    })
});
