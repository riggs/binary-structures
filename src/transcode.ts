import {
    Bits_Sizes,
    Uint_Sizes,
    Int_Sizes,
    Float_Sizes,
    Size,
    Serializer,
    Deserializer,
    uint_pack,
    int_pack,
    float_pack,
    uint_parse,
    int_parse,
    float_parse,
    utf8_pack,
    utf8_parse,
    hex_buffer
} from './serialization';

export type Primatives = number | string;

/* Need to hang Context_Parent off the global Symbol because of Typescript deficiency */
Symbol.Context_Parent = Symbol.for("Context_Parent");

export interface Context_Map extends Map<string, any> {
    [Symbol.Context_Parent]?: Parsed_Context;
}

export interface Context_Array extends Array<any> {
    [Symbol.Context_Parent]?: Parsed_Context;
}

export type Parsed_Context = Context_Map | Context_Array;

export type Packed_Context = any;

export class SerializationError<D> extends Error {
    constructor(message: string, byte_offset?: number, context?: Parsed_Context, data_view?: DataView) {
        super(message);
        this.name = 'SerializationError';
        this.bytes = (data_view !== undefined) ? hex_buffer(data_view.buffer) : '';
        this.byte_offset = byte_offset || 0;
        this.context = context;
    }
    bytes: string;
    byte_offset: number;
    context?: Parsed_Context;
}

/* These functions provided by library consumer to convert data to usable structures. */
export type Encoder<Decoded, Encoded> = (source_data: Decoded, context?: Packed_Context) => Encoded;
export type Decoder<Encoded, Decoded> = (parsed_data: Encoded, context?: Parsed_Context) => Decoded;

export interface Transcoders<Encoded, Decoded> {
    encode?: Encoder<Decoded, Encoded>;
    decode?: Decoder<Encoded, Decoded>;
    little_endian?: boolean;
}

export type Encoded = Primatives | Encoded_Array | Encoded_Map
export interface Encoded_Array extends Array<Encoded> {}
export interface Encoded_Map extends Map<string, Encoded> {}

export const inspect_transcoder = <T>(data: T, context?: Parsed_Context | Packed_Context): T => {
    console.log({data, context});
    return data
};

export const inspect = {
    encode: inspect_transcoder,
    decode: inspect_transcoder,
};

export interface Common_Options {
    byte_offset?: number;
    little_endian?: boolean;
}

export interface Parse_Options extends Common_Options {
    context?: Parsed_Context;
}

export interface Pack_Options extends Common_Options {
    context?: Packed_Context;
    data_view?: DataView;
}

/** A function to fetch the data to be packed.
 *  It is provided by the code handling the data input and called by the packer function to fetch the data to pack.
 */
export interface Fetch<Source, Decoded> {
    (source_data: Source): Decoded;
}

/** A function to deliver the parsed result to the correct place.
 *  It is provided by the code managing the results container and called by the parser function with the parsed data.
 */
export interface Deliver<Decoded> {
    (data: Decoded): void;
}

export interface Packed {
    size: Size;
    buffer: ArrayBuffer;
}

export interface Parsed<Decoded> {
    data: Decoded;
    size: Size; /* In Bytes */
}

export interface Packer<Decoded> {
    <Source>(source_data: Source, options?: Pack_Options, fetch?: Fetch<Source, Decoded>): Packed;
}

export interface Embed_Packer<Decoded> {
    <S extends Array<any>>(source_data: S, options?: Pack_Options, fetch?: Fetch<S, Decoded>): Packed;
}

export interface Parser<Decoded> {
    (data_view: DataView, options?: Parse_Options, deliver?: Deliver<Decoded>): Parsed<Decoded>;
}

/* Explicitly imposing that, for custom Transcoders, output format from deserialization must match input format to serialization */
export interface Struct<Decoded> {
    pack: Packer<Decoded>;
    parse: Parser<Decoded>;
}

const fetch_and_encode = <S, D, E>({source_data, fetch, encode, context}: { source_data: S | D | E, fetch?: Fetch<S, D | E>, encode?: Encoder<S | D, E>, context?: Packed_Context }): E => {
    let fetched;
    if (fetch !== undefined) {
        fetched = fetch(source_data as S);
    } else {
        fetched = source_data as D | E;
    }
    if (encode !== undefined) {
        return encode(fetched as D, context as Packed_Context);
    } else {
        return fetched as E;
    }
};

const decode_and_deliver = <E, D>({parsed_data, decode, context, deliver}: {parsed_data: E | D, decode?: Decoder<E, D>, context?: Parsed_Context, deliver?: Deliver<D>}): D => {
    let decoded: D;
    if (decode !== undefined) {
        decoded = decode(parsed_data as E, context);
    } else {
        decoded = parsed_data as D;
    }
    if (deliver !== undefined) {
        deliver(decoded);
    }
    return decoded;
};

export interface Bytes<Encoded, Decoded> {
    (size: number, transcoders?: Transcoders<Encoded, Decoded>): Struct<Decoded>;
}

const bakery /* it makes Bytes */ = <E, D>(serializer: Serializer<E>, deserializer: Deserializer<E>, verify_size: (bits: number) => boolean) => {
    return <Bytes<E, D>>((bits, transcoders = {}) => {
        if(!verify_size(bits)) {
            throw new Error(`Invalid size: ${bits}`);
        }

        const {encode, decode} = transcoders;

        const pack: Packer<D> = (source_data, options = {}, fetch) => {
            const {data_view = new DataView(new ArrayBuffer(Math.ceil(bits / 8))), byte_offset = 0, little_endian = transcoders.little_endian, context} = options;
            const data = fetch_and_encode({source_data, fetch, encode, context});
            const size = (serializer(data, {bits, data_view, byte_offset, little_endian}) / 8);
            return {size, buffer: data_view.buffer};
        };

        const parse: Parser<D> = (data_view, options = {}, deliver) => {
            const {byte_offset = 0, little_endian = transcoders.little_endian, context} = options;
            const parsed_data = deserializer({bits, data_view, byte_offset, little_endian});
            const data = decode_and_deliver({parsed_data, decode, context, deliver});
            return {data, size: bits / 8};
        };
        return {pack, parse};
    });
};

export const Bits = bakery(uint_pack, uint_parse, (s) => Bits_Sizes.includes(s));

export const Uint = bakery(uint_pack, uint_parse, (s) => Uint_Sizes.includes(s));

export const Int = bakery(int_pack, int_parse, (s) => Int_Sizes.includes(s));

export const Float = bakery(float_pack, float_parse, (s) => Float_Sizes.includes(s));

export const Utf8 = bakery(utf8_pack, utf8_parse, (s) => s % 8 === 0 && s >= 0);

export type Numeric = number | ((context?: Parsed_Context) => number);

const numeric = (n: Numeric, context?: Parsed_Context): number => typeof n === 'number' ? n : n(context);

/** Byte_Buffer doesn't do any serialization, but just copies bytes to/from an ArrayBuffer that's a subset of the
 * serialized buffer. Byte_Buffer only works on byte-aligned data.
 *
 * @param {Numeric} length
 * @param {Transcoders<ArrayBuffer, any>} transcoders
 */
export const Byte_Buffer = <D>(length: Numeric, transcoders: Transcoders<ArrayBuffer, D> = {}): Struct<D> => {
    const {encode, decode} = transcoders;
    const pack: Packer<D> = (source_data, options = {}, fetch) => {
        const {data_view, byte_offset = 0, context} = options;
        const buffer = fetch_and_encode({source_data, fetch, encode, context});
        const size = numeric(length, context);
        if (size !== buffer.byteLength) {
            throw new Error(`Length miss-match. Expected length: ${size}, actual bytelength: ${buffer.byteLength}`)
        }
        if (data_view === undefined) {
            return {size, buffer}
        }
        new Uint8Array(buffer).forEach((value, index) => {
            data_view.setUint8(byte_offset + index, value);
        });
        return {size, buffer: data_view.buffer}
    };
    const parse: Parser<D> = (data_view, options = {}, deliver) => {
        const {byte_offset = 0, context} = options;
        const size = numeric(length, context);
        const buffer = data_view.buffer.slice(byte_offset, byte_offset + size);
        const data = decode_and_deliver({parsed_data: buffer, decode, context, deliver});
        return {data, size};
    };
    return {pack, parse}
};

export type Chooser = (context?: Parsed_Context) => Primatives;
export interface Choices<D> {
    [choice: number]: Struct<D>;
    [choice: string]: Struct<D>;
}

export const Branch = <D>(chooser: Chooser, choices: Choices<D>, default_choice?: Struct<D>): Struct<D> => {
    const choose = (options: Pack_Options = {}, data_view?: DataView): Struct<D> => {
        let choice = chooser(options.context);
        if (choices.hasOwnProperty(choice)) {
            return choices[choice];
        } else {
            if (default_choice !== undefined) {
                return default_choice;
            } else {
                const {byte_offset, context} = options;
                data_view = data_view || options.data_view;
                throw new SerializationError(`Invalid choice: ${choice}`, byte_offset, context, data_view);
            }
        }
    };
    const pack: Packer<D> = (source_data, options = {}, fetch) => {
        return choose(options).pack(source_data, options, fetch);
    };
    const parse: Parser<D> = (data_view, options = {}, deliver) => {
        return choose(options, data_view).parse(data_view, options, deliver);
    };
    return {parse, pack};
};

export const Embed = <D>(thing: Struct<D>) => {
    const pack: Embed_Packer<D> | Packer<D> = (source_data, options, fetch) => {
        if (thing instanceof Byte_Array_Class) {
            return thing.pack(source_data, options, undefined, fetch);
        } else if (thing instanceof Byte_Map_Class) {
            return thing.pack(source_data, options, undefined);
        } else {
            return thing.pack(source_data, options, fetch);
        }
    };
    const parse: Parser<D> = (data_view, options = {}, deliver) => {
        if (thing instanceof Byte_Array_Class) {
            return thing.parse(data_view, options, undefined, options.context as Context_Array);
        } else if (thing instanceof Byte_Map_Class) {
            return thing.parse(data_view, options, undefined, options.context as Context_Map);
        } else {
            return thing.parse(data_view, options, deliver);
        }
    };
    return {pack, parse}
};

export const Padding = (value: number | {bits?: number, bytes?: number} = 0): Struct<null> => {

    let size: number;
    if (typeof value === 'object') {
        let {bits = 0, bytes = 0} = value;
        size = bits / 8 + bytes;
    } else {
        size = value as number;
    }
    if(size < 0) {
        throw new Error(`Invalid size: ${size} bytes`);
    }
    const pack: Packer<null> = (source_data, options = {}, fetch) => {
        return {size, buffer: options.data_view === undefined ? new ArrayBuffer(Math.ceil(size)) : options.data_view.buffer}
    };
    const parse: Parser<null> = (data_view, options = {}, deliver) => {
        return {size, data: null};
    };
    return {pack, parse}
};

export type Map_Options<D, I> = Transcoders<Map<string, I>, D>;
export type Map_Iterable<I> = Array<[string, Struct<I>]>;

export interface Byte_Map_Class<D, I> extends Struct<D>, Map_Options<D, I>, Map<string, Struct<I>> {}
export class Byte_Map_Class<D, I> extends Map<string, Struct<I>> {
    constructor(options: Map_Options<D, I> = {}, iterable?: Map_Iterable<I>) {
        super(iterable);
        let {encode, decode, little_endian} = options;
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    pack<S>(source_data: S, options: Pack_Options = {}, fetch?: Fetch<S, D>) {
        let {data_view, byte_offset = 0, little_endian = this.little_endian, context = source_data} = options;
        const data = fetch_and_encode({source_data, fetch, encode: this.encode, context});
        const packed: Packed[] = [];
        const fetcher = (key: string) => (source: Map<string, I>) => {
               const value = source.get(key);
               if (value === undefined) {
                   throw new Error(`Insufficient data for serialization: ${source_data}`)
               }
               return value;
        };
        let offset = 0;
        for (const [key, item] of this) {
            const {size, buffer} = item.pack(data,
                                             {data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context},
                                             fetcher(key));
            if (data_view === undefined) {
                packed.push({size, buffer});
            }
            offset += size;
        }
        if (data_view === undefined) {
            data_view = concat_buffers(packed, offset);
        }
        return {size: offset, buffer: data_view.buffer};
    }

    parse(data_view: DataView, options: Parse_Options = {}, deliver?: Deliver<D>, results?: Context_Map) {
        const {byte_offset = 0, little_endian = this.little_endian, context} = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = new Map();
            results[Symbol.Context_Parent] = context;
            remove_parent_symbol = true;
        }
        let offset = 0;
        for (const [key, item] of this) {
            const {data, size} = item.parse(data_view,
                                            {byte_offset: byte_offset + offset, little_endian, context: results},
                                            (data) => results!.set(key, data));
            offset += size;
        }
        if (remove_parent_symbol) {
            delete results[Symbol.Context_Parent];
        }
        const data = decode_and_deliver({parsed_data: results, decode: this.decode, context, deliver});
        return {data, size: offset};
    }
}

export const Byte_Map = <D, I>(options?: Map_Options<D, I> | Map_Iterable<I>, iterable?: Map_Iterable<I> | Map_Options<D, I>) => {
    if (options instanceof Array) {
        const _ = iterable;
        iterable = options;
        options = _;
    }
    return new Byte_Map_Class(options as Map_Options<D, I> || {} , iterable as Map_Iterable<I>);
};

const concat_buffers = (packed: Packed[], byte_length: number) => {
    const data_view = new DataView(new ArrayBuffer(Math.ceil(byte_length)));
    let _offset = 0;
    for (const {size, buffer} of packed) {
        /* Copy all the data from the returned buffers into one grand buffer. */
        const bytes = Array.from(new Uint8Array(buffer as ArrayBuffer));
        /* Create a Byte Array with the appropriate number of Uint(8)s, possibly with a trailing Bits. */
        const array = new Byte_Array_Class();
        for (let i = 0; i < Math.floor(size); i++) {
            array.push(Uint(8));
        }
        if (size % 1) {
            array.push(Bits((size % 1) * 8));
        }
        /* Pack the bytes into the buffer */
        array.pack(bytes, {data_view, byte_offset: _offset});

        _offset += size;
    }
    return data_view;
};

export type Array_Options<D, I> = Transcoders<Array<I>, D>;

export interface Byte_Array_Class<D, I> extends Struct<D>, Array_Options<D, I>, Array<Struct<I>> {}
export class Byte_Array_Class<D, I> extends Array<Struct<I>> {
    constructor(options: Array_Options<D, I> = {}, ...elements: Array<Struct<I>>) {
        super(...elements);
        let {encode, decode, little_endian} = options;
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    pack<S>(source_data: S, options: Pack_Options = {}, fetch?: Fetch<S, D>, fetcher?: Fetch<Array<I>, I>) {
        let {data_view, byte_offset = 0, little_endian = this.little_endian, context = source_data} = options;
        const data = fetch_and_encode({source_data, fetch, encode: this.encode, context});
        const packed: Packed[] = [];
        if (fetcher === undefined) {
            const iterator = data[Symbol.iterator]();
            fetcher = (source_data) => {
                const value = iterator.next().value;
                if (value === undefined) {
                    throw new Error(`Insufficient data for serialization: ${source_data}`)
                }
                return value;
            }
        }
        const store = (result: Packed) => {
            if (data_view === undefined) {
                packed.push(result);
            }
        };
        const size = this.__pack_loop(data, {data_view, byte_offset, little_endian, context}, fetcher, store);
        if (data_view === undefined) {
            data_view = concat_buffers(packed, size);
        }
        return {size, buffer: data_view.buffer};
    }

    protected __pack_loop<E>(data: E, {data_view, byte_offset = 0, little_endian, context}: Pack_Options, fetcher: Fetch<E, I>, store: (result: Packed) => void) {
        let offset = 0;
        for (const item of this) {
            const {size, buffer} = item.pack(data, {data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context}, fetcher);
            store({size, buffer});
            offset += size;
        }
        return offset;
    }

    parse(data_view: DataView, options: Parse_Options = {}, deliver?: Deliver<D>, results?: Context_Array) {
        const {byte_offset = 0, little_endian = this.little_endian, context} = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = [];
            results[Symbol.Context_Parent] = context;
            remove_parent_symbol = true;
        }
        const size = this.__parse_loop(data_view, {byte_offset, little_endian, context: results}, (data) => results!.push(data));
        if (remove_parent_symbol) {
            delete results[Symbol.Context_Parent];
        }
        const data = decode_and_deliver({parsed_data: results, decode: this.decode, context, deliver});
        return {data, size};
    }

    protected __parse_loop(data_view: DataView, {byte_offset = 0, little_endian, context}: Parse_Options, deliver: Deliver<I>) {
        let offset = 0;
        for (const item of this) {
            const {data, size} = item.parse(data_view, {byte_offset: byte_offset + offset, little_endian, context}, deliver);
            offset += size;
        }
        return offset;
    }
}

/* This would be much cleaner if JavaScript had interfaces. Or I could make everything subclass Struct... */
const extract_array_options = <D, I>(elements: Array<Struct<I> | Array_Options<D, I>>) => {

    const options: Array_Options<D, I> = {};
    if (elements.length > 0) {
        const first = elements[0];
        if (!first.hasOwnProperty('pack') && !first.hasOwnProperty('parse')) {
            Object.assign(options, first);
            elements.shift();
        } else {
            const last = elements[elements.length - 1];
            if (!last.hasOwnProperty('pack') && !last.hasOwnProperty('parse')) {
                Object.assign(options, last);
                elements.pop();
            }
        }
    }
    return options;
};

export const Byte_Array = <D, I>(...elements: Array<Array_Options<D, I> | Struct<I>>) => {
    return new Byte_Array_Class(extract_array_options(elements), ...elements as Array<Struct<I>>);
};

export class Byte_Repeat<D, I> extends Byte_Array_Class<D, I> {
    count: Numeric;
    constructor(count: Numeric, options: Array_Options<D, I>, ...elements: Array<Struct<I>>) {
        super(options, ...elements);
        this.count = count;
    }

    protected __pack_loop<E>(data: E, {data_view, byte_offset = 0, little_endian, context}: Pack_Options, fetcher: Fetch<E, I>, store: (result: Packed) => void) {
        let offset = 0;
        const count = numeric(this.count, context);
        for (let i = 0; i < count; i++) {
            offset += super.__pack_loop(data, {data_view, byte_offset: byte_offset + offset, little_endian, context}, fetcher, store);
        }
        return offset;
    }

    protected __parse_loop(data_view: DataView, {byte_offset = 0, little_endian, context}: Parse_Options, deliver: Deliver<I>) {
        let offset = 0;
        const count = numeric(this.count, context);
        for (let i = 0; i < count; i++) {
            offset += super.__parse_loop(data_view, {byte_offset: byte_offset + offset, little_endian, context}, deliver);
        }
        return offset;
    }
}

export const Repeat = <D, I>(count: Numeric, ...elements: Array<Array_Options<D, I> | Struct<I>>) => {
    return new Byte_Repeat(count, extract_array_options(elements), ...elements as Array<Struct<I>>);
};

