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

/* Someday, when Typescript can properly handle Symbol indices on objects, I'll return to this. */
// export const Parent = Symbol("Parent");

export interface Context<C> {
    // [Parent]?: C;
    $parent?: C;
}
export type Parent = '$parent'
export const Parent: Parent = '$parent';

export type Contextualized<E extends Context<C>, C> = E;

const set_context = <T, C>(data: T, context?: C): Contextualized<T, C> => {
    if (context !== undefined) {
        (data as Context_Type<T, C>)[Parent] = context;
    }
    return data;
};

const remove_context = <T, C>(data: Contextualized<T, C>, delete_flag: boolean): T => {
    if (delete_flag) {
        delete (data as Context<C>)[Parent];
    }
    return data;
};

export type Mapped<T> = Map<string, T>;

export type Context_Type<E, P> = Contextualized<E & Context<P>, P>;

export type Context_Map<Encoded, Context> = Context_Type<Mapped<Encoded>, Context>;

export type Context_Array<Encoded, Context> = Context_Type<Array<Encoded>, Context>;

export type Context_Iterable<Encoded, Context> = Context_Map<Encoded, Context> | Context_Array<Encoded, Context>;

/* These functions provided by library consumer to convert data to usable structures. */
export type Encoder<Decoded, Encoded, Context> = (decoded: Decoded, context?: Context) => Encoded;
export type Decoder<Encoded, Decoded, Context> = (encoded: Encoded, context?: Context) => Decoded;

export interface Transcoders<Encoded, Decoded, Context> {
    encode?: Encoder<Decoded, Encoded, Context>;
    decode?: Decoder<Encoded, Decoded, Context>;
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
 *  It is provided by the code handling the input data and called by the packer function to fetch the data to pack.
 */
export interface Fetcher<Decoded> {
    (): Decoded;
}

/** A function to deliver the parsed result to the correct place.
 *  It is provided by the code managing the results container and called by the parser function with the parsed data.
 */
export interface Deliver<Decoded> {
    (data: Decoded): void;
}

export interface Common_Options<Context> {
    byte_offset?: number;
    little_endian?: boolean;
    context?: Context;
}

export interface Parse_Options<C> extends Common_Options<C> {}

export interface Pack_Options<C> extends Common_Options<C> {
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

export interface Packer<Decoded, Context> {
    (source: Decoded | Fetcher<Decoded>, options?: Pack_Options<Context>): Packed;
}

export interface Parser<Decoded, Context> {
    (data_view: DataView, options?: Parse_Options<Context>, deliver?: Deliver<Decoded>): Parsed<Decoded>;
}

/* Explicitly imposing that, for custom Transcoders, output format from deserialization must match input format to serialization. */
export interface Struct<Decoded, Context> {
    pack: Packer<Decoded, Context>;
    parse: Parser<Decoded, Context>;
}

/* Called by pack */
const fetch_and_encode = <D, E, C>({source, encode, context}: {source: Fetcher<D | E> | D | E, encode?: Encoder<D, E, C>, context?: C}): E => {
    let decoded;
    if (typeof source === 'function') {
        decoded = source();
    } else {
        decoded = source as D | E;
    }
    if (typeof encode === 'function') {
        return encode(decoded as D, context);
    } else {
        return decoded as E;
    }
};

/* Called by parse */
const decode_and_deliver = <E, D, C>({encoded, decode, context, deliver}: {encoded: E | D, decode?: Decoder<E, D, C>, context?: C, deliver?: Deliver<D>}): D => {
    let decoded;
    if (typeof decode === 'function') {
        decoded = decode(encoded as E, context);
    } else {
        decoded = encoded as D;
    }
    if (typeof deliver === 'function') {
        deliver(decoded);
    }
    return decoded;
};

const factory = <E extends Primitive>(serializer: Serializer<E>, deserializer: Deserializer<E>, verify_size: (bits: number) => boolean) => {
    return (<D, C>(bits: number, transcoders: Transcoders<E, D, C> = {}): Struct<D, C> => {
        if(!verify_size(bits)) {
            throw new Error(`Invalid size: ${bits}`);
        }
        const {encode, decode, little_endian: LE} = transcoders;

        const pack: Packer<D, C> = (source, options = {}) => {
            const {data_view = new DataView(new ArrayBuffer(Math.ceil(bits / 8))), byte_offset = 0, little_endian = LE, context} = options;
            const encoded = fetch_and_encode({source, encode, context}) as E;
            const size = (serializer(encoded, {bits, data_view, byte_offset, little_endian}) / 8);
            return {size, buffer: data_view.buffer};
        };

        const parse: Parser<D, C> = (data_view, options = {}, deliver) => {
            const {byte_offset = 0, little_endian = LE, context} = options;
            const encoded = deserializer({bits, data_view, byte_offset, little_endian});
            const data = decode_and_deliver({encoded, context, decode, deliver}) as D;
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

export type Numeric<C> = number | {bits?: number, bytes?: number} | ((context?: C) => number);

const numeric = <C>(n: Numeric<C>, context?: C): number => {
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
export const Byte_Buffer = <D, C>(length: Numeric<C>, transcoders: Transcoders<ArrayBuffer, D, C> = {}) => {
    const {encode, decode} = transcoders;
    const pack = (source: D | Fetcher<D>, options: Pack_Options<C> = {}): Packed => {
        const {data_view, byte_offset = 0, context} = options;
        const size = numeric(length, context);
        const buffer = fetch_and_encode({source, encode, context});
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
    const parse = (data_view: DataView, options: Parse_Options<C> = {}, deliver?: Deliver<D>) => {
        const {byte_offset = 0, context} = options;
        const size = numeric(length, context);
        const buffer = data_view.buffer.slice(byte_offset, byte_offset + size);
        const data = decode_and_deliver({encoded: buffer, context, decode, deliver});
        return {data, size};
    };
    return {pack, parse}
};

export const Padding = <C>(size: Numeric<C>): Struct<any, C> => {
    const pack: Packer<any, C> = (source, options = {}) => {
        size = numeric(size, options.context) as number;
        return {size, buffer: options.data_view === undefined ? new ArrayBuffer(Math.ceil(size)) : options.data_view.buffer}
    };
    const parse: Parser<any, C> = (data_view, options = {}, deliver) => {
        size = numeric(size, options.context) as number;
        return {size, data: null};
    };
    return {pack, parse}
};

/* Allow Symbols once TypesScript adds support */
export type Chooser<C> = (context?: C) => number | string;
export interface Choices<D, C> {
    [choice: number]: Struct<D, C>;
    [choice: string]: Struct<D, C>;
}

export const Branch = <D, C>({chooser, choices, default_choice}: {chooser: Chooser<C>, choices: Choices<D, C>, default_choice?: Struct<D, C>}): Struct<D, C> => {
    const choose = (source?: C): Struct<D, C> => {
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
    const pack: Packer<D, C> = (source, options = {}) => {
        return choose(options.context).pack(source, options);
    };
    const parse: Parser<D, C> = (data_view, options = {}, deliver) => {
        return choose(options.context).parse(data_view, options, deliver);
    };
    return {parse, pack};
};

export const Embed = <D, C extends Context_Iterable<D, S>, S>(embedded: Struct<Context_Iterable<D, S>, S> | Struct<D, C>): Struct<Context_Iterable<D, S> | D, C> => {
    const pack = (source: Fetcher<D>, options: Pack_Options<C> = {}): Packed => {
        if (options.context !== undefined) {
            const {context} = options;
            (options as Pack_Options<S>).context = context[Parent];
            if (embedded instanceof Array) {
                return (embedded as Binary_Array<D, Context_Array<D, S>, S>).pack(context as Context_Array<D, S>, options as Pack_Options<S>, source);
            } else if (embedded instanceof Map) {
                return (embedded as Binary_Map<D, Context_Map<D, S>, S>).pack(context as Context_Map<D, S>, options as Pack_Options<S>, context as Context_Map<D, S>);
            }
        }
        return (embedded as Struct<D, C>).pack(source, options);
    };
    const parse = (data_view: DataView, options: Parse_Options<C> = {}, deliver?: Deliver<D>): Parsed<Context_Iterable<D, S> | D> => {
        if (options.context !== undefined) {
            const {context} = options;
            (options as Pack_Options<S>).context = context[Parent];
            if (embedded instanceof Array) {
                return (embedded as Binary_Array<D, Context_Array<D, S>, S>).parse(data_view, options as Parse_Options<S>, undefined, context as Context_Array<D, S>);
            } else if (embedded instanceof Map) {
                return (embedded as Binary_Map<D, Context_Map<D, S>, S>).parse(data_view, options as Parse_Options<S>, undefined, context as Context_Map<D, S>);
            }
        }
        return (embedded as Struct<D, C>).parse(data_view, options, deliver);
    };
    return {pack, parse}
};

export type Map_Item<I> = Struct<I, Mapped<I>>;
export type Map_Iterable<I> = Array<[string, Map_Item<I>]>;
export type Map_Transcoders<I, D, C> = Transcoders<Mapped<I>, D, C>;

export interface Binary_Map<I, D, C> extends Mapped<Map_Item<I>>, Struct<D, C> {
    pack: (source: D | Fetcher<D>, options?: Pack_Options<C>, encoded?: Context_Map<I, C>) => Packed;
    parse: (data_view: DataView, options?: Parse_Options<C>, deliver?: Deliver<D>, results?: Context_Map<I, C>) => Parsed<D>;
}

export const Binary_Map = <I, D, C>(transcoders: Map_Transcoders<I, D, C> | Map_Iterable<I> = {}, iterable?: Map_Iterable<I> | Map_Transcoders<I, D, C>): Binary_Map<I, D, C> => {
    if (transcoders instanceof Array) {
        [transcoders, iterable] = [iterable as Map_Transcoders<I, D, C>, transcoders as Map_Iterable<I>];
    }
    const {encode, decode, little_endian: LE} = transcoders;

    const map = new Map((iterable || []) as Map_Iterable<I>) as Binary_Map<I, D, C>;

    map.pack = (source, options = {}, encoded) => {
        const packed: Packed[] = [];
        let {data_view, byte_offset = 0, little_endian = LE, context} = options;
        if (encoded === undefined) {
            encoded = fetch_and_encode({source, encode, context});
            set_context(encoded, context);
        }
        /* Need to return a function to the `pack` chain to enable Embed with value checking. */
        const fetcher = (key: string) => () => {
            const value = encoded!.get(key);
            if (value === undefined) {
                throw new Error(`Insufficient data for serialization: ${key} not in ${encoded}`)
            }
            return value;
        };
        let offset = 0;
        for (const [key, item] of map) {
            const {size, buffer} = item.pack(fetcher(key), {data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context: encoded});
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
        const {byte_offset = 0, little_endian = LE, context} = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = set_context(new Map() as Mapped<I>, context);
            remove_parent_symbol = true;
        }
        let offset = 0;
        for (const [key, item] of map) {
            const {data, size} = item.parse(data_view,
                                            {byte_offset: byte_offset + offset, little_endian, context: results},
                                            (data) => results!.set(key, data));
            offset += size;
        }
        const data = decode_and_deliver<Mapped<I>, D, C>({encoded: results, decode, context, deliver});
        remove_context(results, remove_parent_symbol);
        return {data, size: offset};
    };

    return map;
};

const concat_buffers = (packed: Packed[], byte_length: number) => {
    const data_view = new DataView(new ArrayBuffer(Math.ceil(byte_length)));
    let byte_offset = 0;
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
        array.pack(bytes, {data_view, byte_offset});

        byte_offset += size;
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

export type Array_Item<I> = Struct<I, Array<I>>;
export type Array_Transcoders<I, D, C> = Transcoders<Array<I>, D, C>;

export interface Binary_Array<I, D, C> extends Array<Array_Item<I>>, Struct<D, C> {
    pack: (source: D | Fetcher<D>, options?: Pack_Options<C>, fetcher?: Fetcher<I>) => Packed;
    __pack_loop: (fetcher: Fetcher<I>, options: Pack_Options<Array<I>>, store: (result: Packed) => void, parent?: C) => number;
    parse: (data_view: DataView, options?: Parse_Options<C>, deliver?: Deliver<D>, results?: Context_Array<I, C>) => Parsed<D>;
    __parse_loop: (data_view: DataView, options: Parse_Options<Context_Array<I, C>>, deliver: Deliver<I>, parent?: C) => number;
}

export const Binary_Array = <I, D, C>(...elements: Array<Array_Transcoders<I, D, C> | Array_Item<I>>): Binary_Array<I, D, C> => {
    const {encode, decode, little_endian: LE} = extract_array_options(elements) as Array_Transcoders<I, D, C>;

    const array = new Array(...elements as Array<Array_Item<I>>) as Binary_Array<I, D, C>;

    array.pack = (source, options = {}, fetcher) => {
        let {data_view, byte_offset = 0, little_endian = LE, context} = options;
        const encoded = fetch_and_encode({source, encode, context});
        const packed: Packed[] = [];
        if (fetcher === undefined) {
            set_context(encoded, context);
            const iterator = encoded[Symbol.iterator]();
            fetcher = () => {
                const value = iterator.next().value;
                if (value === undefined) {
                    throw new Error(`Insufficient data for serialization: ${encoded}`)
                }
                return value;
            }
        }
        const store = (result: Packed) => {
            if (data_view === undefined) {
                packed.push(result);
            }
        };
        const size = array.__pack_loop(fetcher, {data_view, byte_offset, little_endian, context: encoded}, store, context);
        if (data_view === undefined) {
            data_view = concat_buffers(packed, size);
        }
        return {size, buffer: data_view.buffer};
    };

    array.__pack_loop = (fetcher, {data_view, byte_offset = 0, little_endian, context}, store) => {
        let offset = 0;
        for (const item of array) {
            const {size, buffer} = item.pack(fetcher, {data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context});
            store({size, buffer});
            offset += size;
        }
        return offset;
    };

    array.parse = (data_view, options = {}, deliver, results) => {
        const {byte_offset = 0, little_endian = LE, context} = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = set_context(new Array() as Array<I>, context);
            remove_parent_symbol = true;
        }
        const size = array.__parse_loop(data_view, {byte_offset, little_endian, context: results}, (data: I) => results!.push(data), context);
        const data = decode_and_deliver({encoded: remove_context(results, remove_parent_symbol), context, decode, deliver});
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

export interface Repeat_Options<I, D, C> extends Array_Transcoders<I, D, C> {
    count?: Numeric<C>;
    bytes?: Numeric<C>;
}

export const Repeat = <I, D, C>(...elements: Array<Repeat_Options<I, D, C> | Array_Item<I>>): Binary_Array<I, D, C> => {
    const {count, bytes, encode, decode, little_endian} = extract_array_options(elements) as Repeat_Options<I, D, C>;

    const array = Binary_Array<I, D, C>({encode, decode, little_endian}, ...elements as Array<Array_Item<I>>);

    const pack_loop = array.__pack_loop;
    const parse_loop = array.__parse_loop;

    array.__pack_loop = (fetcher, {data_view, byte_offset = 0, little_endian, context}, store, parent) => {
        let offset = 0;
        if (count !== undefined) {
            const repeat = numeric(count, parent);
            for (let i = 0; i < repeat; i++) {
                offset += pack_loop(fetcher, {data_view, byte_offset: byte_offset + offset, little_endian, context}, store);
            }
        } else if (bytes !== undefined) {
            const repeat = numeric(bytes, parent);
            while (offset < repeat) {
                offset += pack_loop(fetcher, {data_view, byte_offset: byte_offset + offset, little_endian, context}, store);
            }
            if (offset > repeat) {
                throw new Error(`Cannot pack into ${repeat} bytes.`);
            }
        } else {
            throw new Error("One of count or bytes must specified in options.")
        }
        return offset;
    };

    array.__parse_loop = (data_view, {byte_offset = 0, little_endian, context}, deliver, parent) => {
        let offset = 0;
        if (count !== undefined) {
            const repeat = numeric(count, parent);
            for (let i = 0; i < repeat; i++) {
                offset += parse_loop(data_view, {byte_offset: byte_offset + offset, little_endian, context}, deliver);
            }
        } else if (bytes !== undefined) {
            const repeat = numeric(bytes, parent);
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
