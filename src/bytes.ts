
function hex(value: number) {
    return "0x" + value.toString(16).toUpperCase().padStart(2, "0")
}

function hex_buffer(buffer: ArrayBuffer) {
    return Array.from(new Uint8Array(buffer), hex).join(", ")
}
interface ContextFunction<V, R> {
    (value: V, context: any): R;
}

/** These functions used internally to the library to pack/unpack ArrayBuffers. */
interface Struct {
    pack: ContextFunction<number, DataView>,
    unpack: ContextFunction<DataView, number>,
    little_endian?: boolean | undefined
}

interface SerializationOptions<Sizes> {
    size: Sizes,
    byte_offset: number,
    data_view: DataView,
    bit_offset: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    little_endian?: boolean | undefined
}

/** These functions provided by library consumer to convert data to usable structures. */
interface Transcoder<E /* Encoded Type */, D /* Decoded Type */> {
    encode?: ContextFunction<D, E>,
    decode?: ContextFunction<E, D>,
    little_endian?: boolean | undefined
}

interface Item<S, T> {
    (size: S, options: Transcoder<T, any>): Struct
}

type Int_Sizes = 8 | 16 | 32;

type Uint_Sizes = Int_Sizes | 64;   /* Special case to handle millisecond epoc time (from Date.now()) */

type Uint = Item<Uint_Sizes, number>

type Int = Item<Int_Sizes, number>

type Float = Item<32 | 64, number>

type Bits = Item<number, number>

type Utf8 = Item<number, string>

interface ByteArray extends Transcoder<DataView, any> {
    [index: number]: Struct | ByteObject | ByteArray | undefined
}

interface ByteObject extends Transcoder<DataView, any> {
    [name: string]: Struct | ByteObject | ByteArray | undefined | boolean | ContextFunction<any, any>
}

const uint_pack: ((value: number, options: SerializationOptions<Uint_Sizes>) => void) = (value, options) => {
    const original_value = value;
    value = Math.floor(original_value);
    if (value < 0 || value > 2**options.size || original_value !== value || value > Number.MAX_SAFE_INTEGER) {
        throw new Error(`Unable to encode ${original_value} to Uint${options.size}`)
    }
    const data_view = options.data_view;
    if (options.bit_offset === 0) {
        switch (options.size) {
            case 8:
                data_view.setUint8(options.byte_offset, value);
                break;
            case 16:
                data_view.setUint16(options.byte_offset, value, options.little_endian);
                break;
            case 32:
                data_view.setUint32(options.byte_offset, value, options.little_endian);
                break;
            case 64:    /* Special case to handle millisecond epoc time (from Date.now()) */
                const upper = Math.floor(value/2**32);
                const lower = value % 2**32;
                let low_byte: number;
                let high_byte: number;
                if (options.little_endian) {
                    low_byte = lower; high_byte = upper;
                } else {
                    low_byte = upper; high_byte = lower;
                }
                data_view.setUint32(options.byte_offset, low_byte, options.little_endian);
                data_view.setUint32(options.byte_offset + 4, high_byte, options.little_endian);
                break;
        }
    } else {
        /*
        bits = 5
        buffer = 00011111
        byte = xxxxxxxx

        new_buffer = 000xxxxx xxx11111
         */
        const bits = options.bit_offset;
        const size = options.size;
        const bytes = new Uint8Array(size / 8);
        uint_pack(value, {size: size, bit_offset: 0, byte_offset: 0, data_view: new DataView(bytes.buffer), little_endian: options.little_endian});
        let overlap = data_view.getUint8(options.byte_offset) & (0xFF >> (8 - bits));
        for (const [index, byte] of bytes.entries()) {
            data_view.setUint8(options.byte_offset + index, ((byte << bits) & 0xFF) | overlap);
            overlap = byte >> (8 - bits);
        }
        data_view.setUint8(options.byte_offset + size / 8, overlap);
    }
};

const uint_unpack: ((options: SerializationOptions<Uint_Sizes>) => number) = options => {
    const data_view = options.data_view;
    if (options.bit_offset === 0) {
        switch (options.size) {
            case 8:
                return data_view.getUint8(options.byte_offset);
            case 16:
                return data_view.getUint16(options.byte_offset, options.little_endian);
            case 32:
                return data_view.getUint32(options.byte_offset, options.little_endian);
            case 64:    /* Special case to handle millisecond epoc time (from Date.now()) */
                const low_byte = data_view.getUint32(options.byte_offset, options.little_endian);
                const high_byte = data_view.getUint32(options.byte_offset + 4, options.little_endian);
                let value: number;
                if (options.little_endian) {
                    value = high_byte * 2**32 + low_byte;
                } else {
                    value = low_byte * 2**32 + high_byte;
                }
                if (value > Number.MAX_SAFE_INTEGER) {
                    throw new Error(`Uint64 out of range for Javascript: ${hex_buffer(data_view.buffer.slice(options.byte_offset, options.byte_offset + 8))}`)
                }
                return value;
            default:    /* Unreachable code in TypeScript, but compiler error if absent */
                throw new Error(`Invalid bit size: ${options.size}`);
        }
    } else {
        const bits = options.bit_offset;
        const size = options.size;
        const bytes = new Uint8Array(size / 8);
        let byte = data_view.getUint8(options.byte_offset);
        for (const index of bytes.keys()) {
            const next = data_view.getUint8(options.byte_offset + index + 1);
            bytes[index] = (byte >> bits) | ((next << (8 - bits)) & 255);
            byte = next;
        }
        return uint_unpack({size: size, bit_offset: 0, byte_offset: 0, data_view: new DataView(bytes.buffer), little_endian: options.little_endian});
    }
};

export {uint_pack, uint_unpack};
