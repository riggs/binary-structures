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

export type Primitive = number | string | ArrayBuffer;

/* Need to hang Parent_Context off the global Symbol because of Typescript deficiency */
Symbol.Parent_Context = Symbol.for("Parent_Context");   // Even this doesn't work with set_parent/remove_parent
export const Parent_Context = Symbol.for("Parent_Context");

export interface Parent_Context<P> {
    [Symbol.Parent_Context]?: P;
}

export type Parented<E extends Parent_Context<P>, P> = E;

const set_parent = <T, P>(data: T, parent?: P): Parented<T, P> => {
    if (parent !== undefined) {
        (data as Parent_Context<P>)[Symbol.Parent_Context] = parent;
    }
    return data;
};

const remove_parent = <T, P>(data: Parented<T, P>, delete_flag: boolean): T => {
    if (delete_flag) {
        delete (data as Parent_Context<P>)[Symbol.Parent_Context];
    }
    return data;
};

export type Mapped<T> = Map<string, T>;

export type Parented_Type<E, Parent> = Parented<E & Parent_Context<Parent>, Parent>;

export type Parented_Map<Encoded, Parent> = Parented_Type<Mapped<Encoded>, Parent>;

export type Parented_Array<Encoded, Parent> = Parented_Type<Array<Encoded>, Parent>;

/* These functions provided by library consumer to convert data to usable structures. */
export type Encoder<Decoded, Encoded> = <Source, Parent>(decoded: Decoded, context?: Parented<Source, Parent>) => Encoded;
export type Decoder<Encoded, Decoded> = <Parent>(parsed: Parented<Encoded, Parent>) => Decoded;

export interface Transcoders<Encoded, Decoded> {
    encode?: Encoder<Decoded, Encoded>;
    decode?: Decoder<Encoded, Decoded>;
    little_endian?: boolean;
}

export const inspect_transcoder = <T>(data: T, context?: any): T => {
    console.log({data, context});
    return data
};

export const inspect = {
    encode: inspect_transcoder,
    decode: inspect_transcoder,
};

/** A function to fetch the data to be packed.
 *  It is provided by the code handling the data input and called by the packer function to fetch the data to pack.
 */
export interface Fetcher<Source, Decoded> {
    (source_data: Source): Decoded;
}

/** A function to deliver the parsed result to the correct place.
 *  It is provided by the code managing the results container and called by the parser function with the parsed data.
 */
export interface Deliver<Decoded> {
    (data: Decoded): void;
}

export interface Common_Options {
    byte_offset?: number;
    little_endian?: boolean;
}

export interface Parse_Options<Encoded_Parent> extends Common_Options {
    context?: Encoded_Parent
}

export interface Pack_Options extends Common_Options {
    data_view?: DataView;
}

export interface Packed {
    buffer: ArrayBuffer;
    size: Size; /* In Bytes */
}

export interface Parsed<Decoded> {
    data: Decoded;
    size: Size; /* In Bytes */
}

export interface Packer<Source, Decoded> {
    <Parent>(source_data: Parented<Source | Decoded, Parent>, options?: Pack_Options, fetch?: Fetcher<Parented<Source, Parent>, Decoded>): Packed;
}

export interface Parser<Source, Decoded> {
    (data_view: DataView, options?: Parse_Options<Source>, deliver?: Deliver<Decoded>): Parsed<Decoded>;
}

/* Explicitly imposing that, for custom Transcoders, output format from deserialization must match input format to serialization. */
export interface Struct<Source, Decoded> {
    pack: Packer<Source, Decoded>;
    parse: Parser<Source, Decoded>;
}

interface fetch_and_encode_options<S, P, D, E> {
    source_data: Parented<S | D, P> | E;
    fetch?: Fetcher<S, D | E>;
    encode?: Encoder<D, E>;
}

const fetch_and_encode = <S, P, D, E>({source_data, fetch, encode}: fetch_and_encode_options<S, P, D, E>): E => {
    let fetched;
    if (fetch !== undefined) {
        fetched = fetch(source_data as S);
    } else {
        fetched = source_data as Parented<D, P> | E;
    }
    if (encode !== undefined) {
        return encode(fetched as D, source_data);
    } else {
        return fetched as E;
    }
};

const decode_and_deliver = <E, D, P>({parsed, decode, deliver}: {parsed: Parented<E, P> | D, decode?: Decoder<E, D>, deliver?: Deliver<D>}): D => {
    let decoded: D;
    if (decode !== undefined) {
        decoded = decode(parsed as Parented<E, P>);
    } else {
        decoded = parsed as D;
    }
    if (deliver !== undefined) {
        deliver(decoded);
    }
    return decoded;
};

const factory = <E extends Primitive>(serializer: Serializer<E>, deserializer: Deserializer<E>, verify_size: (bits: number) => boolean) => {
    return (<S, D>(bits: number, transcoders: Transcoders<E, D> = {}): Struct<S, D> => {
        if(!verify_size(bits)) {
            throw new Error(`Invalid size: ${bits}`);
        }
        const {encode, decode} = transcoders;

        const pack: Packer<S, D> = (source_data, options = {}, fetch) => {
            const {data_view = new DataView(new ArrayBuffer(Math.ceil(bits / 8))), byte_offset = 0, little_endian = transcoders.little_endian} = options;
            const data = fetch_and_encode({source_data, fetch, encode});
            /* Don't need to set parent on `data` because serializer doesn't care about parent context. */
            const size = (serializer(data, {bits, data_view, byte_offset, little_endian}) / 8);
            return {size, buffer: data_view.buffer};
        };

        const parse: Parser<S, D> = (data_view, options = {}, deliver) => {
            const {byte_offset = 0, little_endian = transcoders.little_endian, context} = options;
            const parsed = deserializer({bits, data_view, byte_offset, little_endian});
            const data = decode_and_deliver({parsed: set_parent(parsed, context), decode, deliver});
            return {data, size: bits / 8};
        };
        return {pack, parse};
    });
};

export const Bits = factory(uint_pack, uint_parse, (s) => Bits_Sizes.includes(s));

export const Uint = factory(uint_pack, uint_parse, (s) => Uint_Sizes.includes(s));

export const Int = factory(int_pack, int_parse, (s) => Int_Sizes.includes(s));

export const Float = factory(float_pack, float_parse, (s) => Float_Sizes.includes(s));

export const Utf8 = factory(utf8_pack, utf8_parse, (s) => s % 8 === 0 && s >= 0);

export type Numeric<T> = number | {bits?: number, bytes?: number} | (<P>(context?: Parented<T, P>) => number);

const numeric = <T, P>(n: Numeric<T>, context?: Parented<T, P>): number => {
    if (typeof n === 'object') {
        let {bits = 0, bytes = 0} = n;
        n = bits / 8 + bytes;
    } else if (typeof n === 'function') {
        n = n(context);
    } else if (typeof n !== 'number') {
        throw new Error(`Invalid numeric input ${n}`);
    }
    if (n < 0) {
        throw new Error(`Invalid size: ${n} bytes`);
    }
    return n;
};

/** Byte_Buffer doesn't do any serialization, but just copies bytes to/from an ArrayBuffer that's a subset of the
 * serialized buffer. Byte_Buffer only works on byte-aligned data.
 *
 * @param {Numeric} length
 * @param {Transcoders<ArrayBuffer, any>} transcoders
 */
export const Byte_Buffer = <S, D, P>(length: Numeric<Parented<S | D, P>>, transcoders: Transcoders<ArrayBuffer, D> = {}): Struct<S, D> => {
    const {encode, decode} = transcoders;
    const pack = (source_data: Parented<S | D, P>, options: Pack_Options = {}, fetch: Fetcher<Parented<S, P>, D>) => {
        const {data_view, byte_offset = 0} = options;
        const size = numeric(length, source_data as S);
        const buffer = fetch_and_encode({source_data, fetch, encode});
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
    const parse = (data_view: DataView, options: Parse_Options<Parented<S | D, P>> = {}, deliver: Deliver<D>) => {
        const {byte_offset = 0, context} = options;
        const size = numeric(length, context);
        const buffer = data_view.buffer.slice(byte_offset, byte_offset + size);
        const data = decode_and_deliver({parsed: set_parent(buffer, context), decode, deliver});
        return {data, size};
    };
    return {pack, parse}
};

export const Padding = <S, P>(size: Numeric<Parented<S, P>>): Struct<S, any> => {
    const pack: Packer<S, any> = (source_data, options = {}, fetch) => {
        size = numeric(size, source_data as S);
        return {size, buffer: options.data_view === undefined ? new ArrayBuffer(Math.ceil(size)) : options.data_view.buffer}
    };
    const parse: Parser<S, any> = (data_view, options = {}, deliver) => {
        size = numeric(size, options.context);
        return {size, data: null};
    };
    return {pack, parse}
};

export type Chooser<T, P> = (context?: Parented<T, P>) => number | string;
export interface Choices<S, D> {
    [choice: number]: Struct<S, D>;
    [choice: string]: Struct<S, D>;
}

export const Branch = <S, D, P>(chooser: Chooser<S | D, P>, choices: Choices<S, D>, default_choice?: Struct<S, D>): Struct<S, D> => {
    const choose = (source?: Parented<S | D, P>): Struct<S, D> => {
        let choice = chooser(source);
        if (choices.hasOwnProperty(choice)) {
            return choices[choice];
        } else {
            if (default_choice !== undefined) {
                return default_choice;
            } else {
                throw new Error(`Choice ${choice} not in ${Object.keys(choices)}`);
            }
        }
    };
    const pack: Packer<S, D> = (source_data, options = {}, fetch) => {
        return choose(source_data as S | D).pack(source_data, options, fetch);
    };
    const parse: Parser<S, D> = (data_view, options = {}, deliver) => {
        return choose(options.context).parse(data_view, options, deliver);
    };
    return {parse, pack};
};

export const Embed = <S, D, I>(thing: Struct<S, D>) => {
    const pack: Packer<S, D> = (source_data, options, fetch) => {
        if (thing instanceof Array) {
            return (thing as Binary_Array<S, D, I>).pack(source_data as S, options, undefined, fetch as Fetcher<Array<I>, I>);
        } else if (thing instanceof Map) {
            return (thing as Binary_Map<S, D, I>).pack(source_data as S, options, undefined);
        } else {
            return thing.pack(source_data as S, options, fetch as Fetcher<S, D>);
        }
    };
    const parse: Parser<S, D> = (data_view, options = {}, deliver) => {
        if (thing instanceof Array) {
            return (thing as Binary_Array<S, D, I>).parse(data_view, options as Parse_Options<S>, undefined, options.context as Parented_Array<I, S>);
        } else if (thing instanceof Map) {
            return (thing as Binary_Map<S, D, I>).parse(data_view, options as Parse_Options<S>, undefined, options.context as Parented_Map<I, S>);
        } else {
            return thing.parse(data_view, options as Parse_Options<S>, deliver);
        }
    };
    return {pack, parse}
};

export type Map_Item<I> = Struct<Mapped<I>, I>;
export type Map_Iterable<I> = Array<[string, Map_Item<I>]>;
export type Map_Transcoders<D, I> = Transcoders<Mapped<I>, D>;

export interface Binary_Map<S, D, I> extends Mapped<Map_Item<I>>, Struct<S, D> {
    parse: (data_view: DataView, options?: Parse_Options<S>, deliver?: Deliver<D>, results?: Parented_Map<I, S>) => Parsed<D>;
}

export const Binary_Map = <S, D, I>(transcoders: Map_Transcoders<D, I> | Map_Iterable<I> = {}, iterable?: Map_Iterable<I> | Map_Transcoders<D, I>) => {
    if (transcoders instanceof Array) {
        [transcoders, iterable] = [iterable as Map_Transcoders<D, I>, transcoders as Map_Iterable<I>];
    }
    const {encode, decode, little_endian: _little_endian} = transcoders;

    const map = new Map() as Binary_Map<S, D, I>;

    map.pack = (source_data, options = {}, fetch) => {
        let {data_view, byte_offset = 0, little_endian = _little_endian} = options;
        const encoded = fetch_and_encode({source_data, fetch, encode});
        const packed: Packed[] = [];
        const fetcher = (key: string) => (source: typeof encoded) => {
            const value = source.get(key);
            if (value === undefined) {
                throw new Error(`Insufficient data for serialization: ${key} not in ${source_data}`)
            }
            return value;
        };
        let offset = 0;
        for (const [key, item] of map) {
            const {size, buffer} = item.pack(set_parent(encoded, source_data),
                                             {data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian},
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
    };

    map.parse = (data_view, options = {}, deliver, results) => {
        const {byte_offset = 0, little_endian = _little_endian, context} = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = set_parent(new Map() as Mapped<I>, context);
            remove_parent_symbol = true;
        }
        let offset = 0;
        for (const [key, item] of map) {
            const {data, size} = item.parse(data_view,
                                            {byte_offset: byte_offset + offset, little_endian, context: results},
                                            (data) => results!.set(key, data));
            offset += size;
        }
        const data = decode_and_deliver<Mapped<I>, D, S>({parsed: results, decode, deliver});
        remove_parent(results, remove_parent_symbol);
        return {data, size: offset};
    };

    return map;
};

const concat_buffers = (packed: Packed[], byte_length: number) => {
    const data_view = new DataView(new ArrayBuffer(Math.ceil(byte_length)));
    let _offset = 0;
    for (const {size, buffer} of packed) {
        /* Copy all the data from the returned buffers into one grand buffer. */
        const bytes = Array.from(new Uint8Array(buffer as ArrayBuffer));
        /* Create a Byte Array with the appropriate number of Uint(8)s, possibly with a trailing Bits. */
        const array = Binary_Array();
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

/* This would be much cleaner if JavaScript had interfaces. Or I could make everything subclass Struct... */
const extract_array_options = <Items, Transcoders>(elements: Array<Items | Transcoders> = []) => {
    if (elements.length > 0) {
        const first = elements[0];
        if (!first.hasOwnProperty('pack') && !first.hasOwnProperty('parse')) {
            return elements.shift() as Transcoders;
        }
        const last = elements[elements.length - 1];
        if (!last.hasOwnProperty('pack') && !last.hasOwnProperty('parse')) {
            return elements.pop() as Transcoders;
        }
    }
    return {} as Transcoders;
};

export type Array_Item<I> = Struct<Array<I>, I>;
export type Array_Transcoders<D, I> = Transcoders<Array<I>, D>;

export interface Binary_Array<S, D, I> extends Array<Array_Item<I>>, Struct<S, D> {
    pack: <P>(source_data: Parented<S | D, P>, options?: Pack_Options, fetch?: Fetcher<Parented<S, P>, D>, fetcher?: Fetcher<Array<I>, I>) => Packed;
    __pack_loop: (data: Array<I>, {data_view, byte_offset, little_endian}: Pack_Options, fetcher: Fetcher<Array<I>, I>, store: (result: Packed) => void) => number;
    parse: (data_view: DataView, options?: Parse_Options<S>, deliver?: Deliver<D>, results?: Parented_Array<I, S>) => Parsed<D>;
    __parse_loop: (data_view: DataView, {byte_offset, little_endian, context}: Parse_Options<Parented_Array<I, S>>, deliver: Deliver<I>) => number;
}

export const Binary_Array = <S, D, I>(...elements: Array<Array_Transcoders<D, I> | Array_Item<I>>): Binary_Array<S, D, I> => {
    const {encode, decode, little_endian: _little_endian} = extract_array_options(elements) as Array_Transcoders<D, I>;

    const array = new Array(...elements as Array<Array_Item<I>>) as Binary_Array<S, D, I>;

    array.pack = (source_data, options = {}, fetch, fetcher?: Fetcher<Array<I>, I>) => {
        let {data_view, byte_offset = 0, little_endian = _little_endian} = options;
        const encoded = fetch_and_encode({source_data, fetch, encode});
        const packed: Packed[] = [];
        if (fetcher === undefined) {
            const iterator = encoded[Symbol.iterator]();
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
        const size = array.__pack_loop(set_parent(encoded, source_data), {data_view, byte_offset, little_endian}, fetcher, store);
        if (data_view === undefined) {
            data_view = concat_buffers(packed, size);
        }
        return {size, buffer: data_view.buffer};
    };

    array.__pack_loop = (data, {data_view, byte_offset = 0, little_endian}, fetcher, store) => {
        let offset = 0;
        for (const item of array) {
            const {size, buffer} = item.pack(data, {data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian}, fetcher);
            store({size, buffer});
            offset += size;
        }
        return offset;
    };

    array.parse = (data_view, options = {}, deliver, results) => {
        const {byte_offset = 0, little_endian = _little_endian, context} = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = set_parent(new Array(), context);
            remove_parent_symbol = true;
        }
        const size = array.__parse_loop(data_view, {byte_offset, little_endian, context: results}, (data: I) => results!.push(data));
        const data = decode_and_deliver({parsed: remove_parent(results, remove_parent_symbol), decode, deliver});
        return {data, size};
    };

    array.__parse_loop = (data_view, {byte_offset = 0, little_endian, context}, deliver) => {
        let offset = 0;
        for (const item of array) {
            const {data, size} = item.parse(data_view, {byte_offset: byte_offset + offset, little_endian, context}, deliver);
            offset += size;
        }
        return offset;
    };

    return array;
};

export interface Repeat_Options<S, D, I> extends Array_Transcoders<D, I> {
    count?: Numeric<Parented_Array<I, S>>;
    bytes?: Numeric<Parented_Array<I, S>>;
}

export const Repeat = <S, D, I>(...elements: Array<Repeat_Options<S, D, I> | Array_Item<I>>): Binary_Array<S, D, I> => {
    const {count, bytes, encode, decode, little_endian} = extract_array_options(elements) as Repeat_Options<S, D, I>;

    const array = Binary_Array<S, D, I>({encode, decode, little_endian}, ...elements as Array<Array_Item<I>>);

    const pack_loop = array.__pack_loop;
    const parse_loop = array.__parse_loop;

    array.__pack_loop = (data, {data_view, byte_offset = 0, little_endian}, fetcher, store) => {
        let offset = 0;
        if (count !== undefined) {
            const repeat = numeric(count, data);
            for (let i = 0; i < repeat; i++) {
                offset += pack_loop(data, {data_view, byte_offset: byte_offset + offset, little_endian}, fetcher, store);
            }
        } else if (bytes !== undefined) {
            const repeat = numeric(bytes, data);
            while (offset < repeat) {
                offset += pack_loop(data, {data_view, byte_offset: byte_offset + offset, little_endian}, fetcher, store);
            }
            if (offset > repeat) {
                throw new Error(`Cannot pack into ${repeat} bytes.`);
            }
        } else {
            throw new Error("One of count or bytes must specified in options.")
        }
        return offset;
    };

    array.__parse_loop = (data_view, {byte_offset = 0, little_endian, context}, deliver) => {
        let offset = 0;
        if (count !== undefined) {
            const repeat = numeric(count, context);
            for (let i = 0; i < repeat; i++) {
                offset += parse_loop(data_view, {byte_offset: byte_offset + offset, little_endian, context}, deliver);
            }
        } else if (bytes !== undefined) {
            const repeat = numeric(bytes, context);
            while (offset < repeat) {
                offset += parse_loop(data_view, {byte_offset: byte_offset + offset, little_endian, context}, deliver);
            }
            if (offset > repeat) {
                throw new Error(`Cannot parse exactly ${repeat} bytes.`);
            }
        } else {
            throw new Error("One of count or bytes must specified in options.")
        }
        return offset;
    };

    return array;
};
