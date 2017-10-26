
import {bits, uint, int, float, utf8, embed, Byte_Array, Byte_Map} from '../src/transcode';

describe("Byte_Array", () => {
    test("simplest case", () => {
        const array = new Uint8Array([42]);
        const byte_array = new Byte_Array({}, uint(8));
        expect(byte_array.parse(array.buffer, {})).toEqual([42])
    });
});
