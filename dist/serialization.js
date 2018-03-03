export const hex = (value) => {
    return "0x" + value.toString(16).toUpperCase().padStart(2, "0");
};
export const hex_buffer = (buffer) => {
    return Array.from(new Uint8Array(buffer), hex).join(", ");
};
const utf8_encoder = new TextEncoder();
const utf8_decoder = new TextDecoder();
export const Bits_Sizes = [1, 2, 3, 4, 5, 6, 7];
export const Uint_Sizes = Bits_Sizes.concat([8, 16, 32, 64]);
export const Int_Sizes = [8, 16, 32];
export const Float_Sizes = [32, 64];
const write_bit_shift = (packer, value, { bits, data_view, byte_offset = 0, little_endian }) => {
    /*
     bit_offset = 5
     buffer = 00011111
     byte = xxxxxxxx

     new_buffer = 000xxxxx xxx11111
     */
    const bit_offset = (byte_offset % 1) * 8;
    byte_offset = Math.floor(byte_offset);
    const bytes = new Uint8Array(Math.ceil(bits / 8));
    const bit_length = packer(value, { bits, byte_offset: 0, data_view: new DataView(bytes.buffer), little_endian });
    let overlap = data_view.getUint8(byte_offset) & (0xFF >> (8 - bit_offset));
    for (const [index, byte] of bytes.entries()) {
        data_view.setUint8(byte_offset + index, ((byte << bit_offset) & 0xFF) | overlap);
        overlap = byte >> (8 - bit_offset);
    }
    if (bit_offset + bits > 8) {
        data_view.setUint8(byte_offset + Math.ceil(bits / 8), overlap);
    }
    return bit_length;
};
const read_bit_shift = (parser, { bits, data_view, byte_offset = 0, little_endian }) => {
    const bit_offset = (byte_offset % 1) * 8;
    byte_offset = Math.floor(byte_offset);
    const bytes = new Uint8Array(Math.ceil(bits / 8));
    let byte = data_view.getUint8(byte_offset);
    if (bit_offset + bits > 8) {
        for (const index of bytes.keys()) {
            const next = data_view.getUint8(byte_offset + index + 1);
            bytes[index] = (byte >> bit_offset) | ((next << (8 - bit_offset)) & (0xFF >> (bits < 8 ? (8 - bits) : 0)));
            byte = next;
        }
    }
    else {
        bytes[0] = byte >> bit_offset & (0xFF >> (8 - bits));
    }
    return parser({ bits, byte_offset: 0, data_view: new DataView(bytes.buffer), little_endian });
};
export const uint_pack = (value, { bits, data_view, byte_offset = 0, little_endian }) => {
    const numeric = Number(value);
    if (numeric < 0 || numeric > 2 ** bits || !Number.isSafeInteger(numeric)) {
        throw new Error(`Unable to encode ${value} to Uint${bits}`);
    }
    if (byte_offset % 1) {
        return write_bit_shift(uint_pack, numeric, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
                data_view.setUint8(byte_offset, numeric);
                break;
            case 16:
                data_view.setUint16(byte_offset, numeric, little_endian);
                break;
            case 32:
                data_view.setUint32(byte_offset, numeric, little_endian);
                break;
            case 64:/* Special case to handle millisecond epoc time (from Date.now()) */ 
                const upper = Math.floor(numeric / 2 ** 32);
                const lower = numeric % 2 ** 32;
                let low_byte;
                let high_byte;
                if (little_endian) {
                    low_byte = lower;
                    high_byte = upper;
                }
                else {
                    low_byte = upper;
                    high_byte = lower;
                }
                data_view.setUint32(byte_offset, low_byte, little_endian);
                data_view.setUint32(byte_offset + 4, high_byte, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};
export const uint_parse = ({ bits, data_view, byte_offset = 0, little_endian }) => {
    if (byte_offset % 1) {
        return read_bit_shift(uint_parse, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                return data_view.getUint8(byte_offset) & (0xFF >> (8 - bits));
            case 8:
                return data_view.getUint8(byte_offset);
            case 16:
                return data_view.getUint16(byte_offset, little_endian);
            case 32:
                return data_view.getUint32(byte_offset, little_endian);
            case 64:/* Special case to handle millisecond epoc time (from Date.now()) */ 
                const low_byte = data_view.getUint32(byte_offset, little_endian);
                const high_byte = data_view.getUint32(byte_offset + 4, little_endian);
                let value;
                if (little_endian) {
                    value = high_byte * 2 ** 32 + low_byte;
                }
                else {
                    value = low_byte * 2 ** 32 + high_byte;
                }
                if (value > Number.MAX_SAFE_INTEGER) {
                    throw new Error(`Uint64 out of range for Javascript: ${hex_buffer(data_view.buffer.slice(byte_offset, byte_offset + 8))}`);
                }
                return value;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
    }
};
export const int_pack = (value, { bits, data_view, byte_offset = 0, little_endian }) => {
    const numeric = Number(value);
    if (numeric < -(2 ** (bits - 1)) || numeric > 2 ** (bits - 1) - 1 || !Number.isSafeInteger(numeric)) {
        throw new Error(`Unable to encode ${value} to Int${bits}`);
    }
    if (byte_offset % 1) {
        return write_bit_shift(int_pack, numeric, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 8:
                data_view.setUint8(byte_offset, numeric);
                break;
            case 16:
                data_view.setUint16(byte_offset, numeric, little_endian);
                break;
            case 32:
                data_view.setUint32(byte_offset, numeric, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};
export const int_parse = ({ bits, data_view, byte_offset = 0, little_endian }) => {
    if (byte_offset % 1) {
        return read_bit_shift(int_parse, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 8:
                return data_view.getInt8(byte_offset);
            case 16:
                return data_view.getInt16(byte_offset, little_endian);
            case 32:
                return data_view.getInt32(byte_offset, little_endian);
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
    }
};
export const float_pack = (value, { bits, data_view, byte_offset = 0, little_endian }) => {
    const numeric = Number(value);
    /* TODO: Input validation; NaN is a valid Float */
    // if ( !Number.isFinite(numeric) ) {
    //     throw new Error(`Unable to encode ${value} to Float${bits}`)
    // }
    if (byte_offset % 1) {
        return write_bit_shift(float_pack, numeric, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 32:
                data_view.setFloat32(byte_offset, numeric, little_endian);
                break;
            case 64:
                data_view.setFloat64(byte_offset, numeric, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};
export const float_parse = ({ bits, data_view, byte_offset = 0, little_endian }) => {
    if (byte_offset % 1) {
        return read_bit_shift(float_parse, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 32:
                return data_view.getFloat32(byte_offset, little_endian);
            case 64:
                return data_view.getFloat64(byte_offset, little_endian);
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
    }
};
export const utf8_pack = (value, { bits, data_view, byte_offset = 0 }) => {
    if (byte_offset % 1) {
        return write_bit_shift(utf8_pack, value, { bits, data_view, byte_offset });
    }
    else {
        const byte_array = utf8_encoder.encode(value);
        const byte_length = byte_array.byteLength;
        if (bits > 0 && byte_length > bits / 8) {
            throw new Error(`Input string serializes to longer than ${bits / 8} bytes:\n${value}`);
        }
        if (byte_length + byte_offset > data_view.byteLength) {
            throw new Error(`Insufficient space in ArrayBuffer to store length ${byte_length} string:\n${value}`);
        }
        for (const [index, byte] of byte_array.entries()) {
            data_view.setUint8(byte_offset + index, byte);
        }
        return byte_length * 8;
    }
};
export const utf8_parse = ({ bits, data_view, byte_offset = 0 }) => {
    if (byte_offset % 1) {
        return read_bit_shift(utf8_parse, { bits, data_view, byte_offset });
    }
    else {
        return utf8_decoder.decode(new DataView(data_view.buffer, byte_offset, bits ? bits / 8 : undefined));
    }
};
//# sourceMappingURL=serialization.js.map