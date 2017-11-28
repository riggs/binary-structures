
export function hex(value: number) {
    return "0x" + value.toString(16).toUpperCase().padStart(2, "0")
}

export function hex_buffer(buffer: ArrayBuffer) {
    return Array.from(new Uint8Array(buffer), hex).join(", ")
}

const utf8_encoder = new TextEncoder();
const utf8_decoder = new TextDecoder();

export const Bits_Sizes = [1, 2, 3, 4, 5, 6, 7];

export const Uint_Sizes = Bits_Sizes.concat([8, 16, 32, 64]);

export const Int_Sizes = [8, 16, 32];

export const Float_Sizes = [32, 64];

export type Size = number;

export interface Serialization_Options {
    bits: Size;
    byte_offset?: number;
    data_view: DataView;
    little_endian?: boolean;
}

export interface Serializer<T> {
    (value: T, options: Serialization_Options): Size;
}

export interface Deserializer<T> {
    (options: Serialization_Options): T;
}

const write_bit_shift: ((packer: Serializer<any>, value: any, options: Serialization_Options) => Size) =
        (packer, value, {bits, data_view, byte_offset = 0, little_endian}) => {
    /*
    bit_offset = 5
    buffer = 00011111
    byte = xxxxxxxx

    new_buffer = 000xxxxx xxx11111
     */
    const bit_offset = (byte_offset % 1) * 8;
    byte_offset = Math.floor(byte_offset);
    const bytes = new Uint8Array(Math.ceil(bits / 8));
    const bit_length = packer(value, {bits, byte_offset: 0, data_view: new DataView(bytes.buffer), little_endian});
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

const read_bit_shift: ((parser: Deserializer<any>, options: Serialization_Options) => any) =
    (parser, {bits, data_view, byte_offset = 0, little_endian}) => {
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
        } else {
            bytes[0] = byte >> bit_offset & (0xFF >> (8 - bits));
        }
        return parser({bits, byte_offset: 0, data_view: new DataView(bytes.buffer), little_endian});
    };

export const uint_pack: Serializer<number> = (value, {bits, data_view, byte_offset = 0, little_endian}) => {
    const original_value = value;
    value = Math.floor(original_value);
    if (value < 0 || value > 2**bits || original_value !== value || value > Number.MAX_SAFE_INTEGER) {
        throw new Error(`Unable to encode ${original_value} to Uint${bits}`)
    }
    if (byte_offset % 1) {
        return write_bit_shift(uint_pack, value, {bits, data_view, byte_offset, little_endian});
    } else {
        switch (bits) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
                data_view.setUint8(byte_offset, value);
                break;
            case 16:
                data_view.setUint16(byte_offset, value, little_endian);
                break;
            case 32:
                data_view.setUint32(byte_offset, value, little_endian);
                break;
            case 64:    /* Special case to handle millisecond epoc time (from Date.now()) */
                const upper = Math.floor(value/2**32);
                const lower = value % 2**32;
                let low_byte: number;
                let high_byte: number;
                if (little_endian) {
                    low_byte = lower; high_byte = upper;
                } else {
                    low_byte = upper; high_byte = lower;
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

export const uint_parse: Deserializer<number> = ({bits, data_view, byte_offset = 0, little_endian}) => {
    if (byte_offset % 1) {
        return read_bit_shift(uint_parse, {bits, data_view, byte_offset, little_endian});
    } else {
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
            case 64:    /* Special case to handle millisecond epoc time (from Date.now()) */
                const low_byte = data_view.getUint32(byte_offset, little_endian);
                const high_byte = data_view.getUint32(byte_offset + 4, little_endian);
                let value: number;
                if (little_endian) {
                    value = high_byte * 2**32 + low_byte;
                } else {
                    value = low_byte * 2**32 + high_byte;
                }
                if (value > Number.MAX_SAFE_INTEGER) {
                    throw new Error(`Uint64 out of range for Javascript: ${hex_buffer(data_view.buffer.slice(byte_offset, byte_offset + 8))}`)
                }
                return value;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
    }
};

export const int_pack: Serializer<number> = (value, {bits, data_view, byte_offset = 0, little_endian}) => {
    const original_value = value;
    value = Math.floor(original_value);
    if (value < -(2**(bits-1)) || value > 2**(bits - 1) - 1 || original_value !== value) {
        throw new Error(`Unable to encode ${original_value} to Int${bits}`)
    }
    if (byte_offset % 1) {
        return write_bit_shift(int_pack, value, {bits, data_view, byte_offset, little_endian});
    } else {
        switch (bits) {
            case 8:
                data_view.setUint8(byte_offset, value);
                break;
            case 16:
                data_view.setUint16(byte_offset, value, little_endian);
                break;
            case 32:
                data_view.setUint32(byte_offset, value, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};

export const int_parse: Deserializer<number> = ({bits, data_view, byte_offset = 0, little_endian}) => {
    if (byte_offset % 1) {
        return read_bit_shift(int_parse, {bits, data_view, byte_offset, little_endian});
    } else {
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

export const float_pack: Serializer<number> = (value, {bits, data_view, byte_offset = 0, little_endian}) => {
    /* TODO: Input validation */
    if (byte_offset % 1) {
        return write_bit_shift(float_pack, value, {bits, data_view, byte_offset, little_endian});
    } else {
        switch (bits) {
            case 32:
                data_view.setFloat32(byte_offset, value, little_endian);
                break;
            case 64:
                data_view.setFloat64(byte_offset, value, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};

export const float_parse: Deserializer<number> = ({bits, data_view, byte_offset = 0, little_endian}) => {
    if (byte_offset % 1) {
        return read_bit_shift(float_parse, {bits, data_view, byte_offset, little_endian});
    } else {
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

export const utf8_pack: Serializer<string> = (value, {bits, data_view, byte_offset = 0}) => {
    if (byte_offset % 1) {
        return write_bit_shift(utf8_pack, value, {bits, data_view, byte_offset});
    } else {
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

export const utf8_parse: Deserializer<string> = ({bits, data_view, byte_offset = 0}) => {
    if (byte_offset % 1) {
        return read_bit_shift(utf8_parse, {bits, data_view, byte_offset});
    } else {
        return utf8_decoder.decode(new DataView(data_view.buffer, byte_offset, bits ? bits / 8 : undefined));
    }
};
