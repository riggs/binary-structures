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
    utf8_parse
} from './serialization';

import './improved_map';

type Primatives = number | string;

/* Need to hang Context_Parent off the global Symbol because of Typescript deficiency */
Symbol.Context_Parent = Symbol.for("Context_Parent");

export interface Context_Map extends Map<string, any>{
    [Symbol.Context_Parent]?: Context;
}

export interface Context_Array extends Array<any> {
    [Symbol.Context_Parent]?: Context;
}

type Context = Context_Map | Context_Array;

/* These functions provided by library consumer to convert data to usable structures. */
export type Encoder<T> = (data: any, context?: any) => T;
export type Decoder<T> = (data: T, context?: Context) => any;

interface Transcoders<T> {
    encode?: Encoder<T>;
    decode?: Decoder<T>;
    little_endian?: boolean;
}

export const inspect_transcoder = (data: any, context?: Context) => {
    console.log({data, context});
    return data
};

export const inspect = {
    encode: inspect_transcoder,
    decode: inspect_transcoder,
};

interface Parse_Options {
    byte_offset?: number;
    little_endian?: boolean | undefined;
    context?: Context;
}

interface Pack_Options extends Parse_Options {
    data_view?: DataView;
}

interface Fetch {
    (data: any): any;
}

interface Packed {
    size: Size;
    buffer: ArrayBuffer;
}

interface Packer {
    (data: any, options?: Pack_Options, fetch?: Fetch): Packed;
}

interface Deliver {
    (data: any): void;
}

interface Parsed {
    data: any;
    size: Size; /* In Bytes */
}

interface Parser {
    (data_view: DataView, options?: Parse_Options, deliver?: Deliver): Parsed;
}
interface Struct {
    pack: Packer;
    parse: Parser;
}

interface Bytes<T> {
    (size: number, transcoders?: Transcoders<T>): Struct;
}

const bakery /* factory that makes Bytes */ = (serializer: Serializer<Primatives>, deserializer: Deserializer<Primatives>, verify_size: (bits: number) => boolean) => {
    return <Bytes<Primatives>>((bits, transcoders = {}) => {
        if(!verify_size(bits)) {
            throw new Error(`Invalid size: ${bits}`);
        }

        const {encode, decode} = transcoders;

        const pack: Packer = (data, options = {}, fetch) => {
            let {data_view = new DataView(new ArrayBuffer(Math.ceil(bits / 8))), byte_offset = 0, little_endian = transcoders.little_endian, context} = options;
            if (fetch !== undefined) {
                data = fetch(data);
            }
            if (encode !== undefined) {
                data = encode(data, context);
            }
            const size = (serializer(data, {bits, data_view, byte_offset, little_endian}) / 8);
            return {size, buffer: data_view.buffer};
        };

        const parse: Parser = (data_view, options = {}, deliver) => {
            let {byte_offset = 0, little_endian = transcoders.little_endian, context} = options;

            let data = deserializer({bits, data_view, byte_offset, little_endian});

            if (decode !== undefined) {
                data = decode(data, context);
            }
            if (deliver !== undefined) {
                deliver(data);
            }
            return {data, size: bits / 8};
        };
        return {pack, parse};
    });
};

export const Bits: Bytes<number> = bakery(uint_pack, uint_parse, (s) => Bits_Sizes.includes(s));

export const Uint: Bytes<number> = bakery(uint_pack, uint_parse, (s) => Uint_Sizes.includes(s));

export const Int: Bytes<number> = bakery(int_pack, int_parse, (s) => Int_Sizes.includes(s));

export const Float: Bytes<number> = bakery(float_pack, float_parse, (s) => Float_Sizes.includes(s));

export const Utf8: Bytes<string> = bakery(utf8_pack, utf8_parse, (s) => s % 8 === 0 && s >= 0);

type Chooser = (context?: Context) => number | string;
interface Choices {
    [choice: number]: Struct;
    [choice: string]: Struct;
}

export const Branch = (choose: Chooser, choices: Choices): Struct => {
    const pack: Packer = (data, options = {}, fetch) => {
        return choices[choose(options.context)].pack(data, options, fetch);
    };
    const parse: Parser = (data_view, options = {}, deliver) => {
        return choices[choose(options.context)].parse(data_view, options, deliver);
    };
    return {parse, pack};
};

export const Embed: ((thing: Byte_Array_Class | Byte_Map_Class | Struct) => Struct) = (thing) => {
    const pack: Packer = (data, options, fetch) => {
        if (thing instanceof Byte_Array_Class) {
            return thing.pack(data, options, undefined, fetch);
        } else if (thing instanceof Byte_Map_Class) {
            return thing.pack(data, options, undefined);
        } else {
            return thing.pack(data, options, fetch);
        }
    };
    const parse: Parser = (data_view, options = {}, deliver) => {
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

const concat_buffers = (packed: Packed[], byte_length: number) => {
    const data_view = new DataView(new ArrayBuffer(Math.ceil(byte_length)));
    let _offset = 0;
    for (const {size, buffer} of packed) {
        /* Copy all the data from the returned buffers into one grand buffer. */
        const bytes = Array.from(new Uint8Array(buffer as ArrayBuffer));
        /* Create a Byte Array with the appropriate number of Uint(8)s, possibly with a trailing Bits. */
        const array = [];
        for (let i = 0; i < Math.floor(size); i++) {
            array.push(Uint(8));
        }
        if (size % 1) {
            array.push(Bits((size % 1) * 8));
        }
        /* Pack the bytes into the buffer */
        Byte_Array(...array).pack(bytes, {data_view, byte_offset: _offset});

        _offset += size;
    }
    return data_view;
};

export type Byte_Array = Array<Primatives>;
type Array_Options = Transcoders<Byte_Array>;

interface Byte_Array_Class extends Struct, Array_Options, Array<Struct> {}

class Byte_Array_Class extends Array<Struct> {
    constructor({encode, decode, little_endian}: Array_Options, ...elements: Struct[]) {
        super(...elements);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    pack(data: any, options: Pack_Options = {}, fetch?: Fetch, fetcher?: Fetch) {
        let {data_view, byte_offset = 0, little_endian = this.little_endian, context = data} = options;
        if (fetch !== undefined) {
            data = fetch(data);
        }
        if (this.encode !== undefined) {
            data = this.encode(data, context);
        }
        let offset = 0;
        const packed: Packed[] = [];

        if (fetcher === undefined) {
            const iterator = data[Symbol.iterator]();
            fetcher = () => iterator.next().value;
        }

        for (const item of this) {
            const {size, buffer} = item.pack(data, {data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context}, fetcher);
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

    parse(data_view: DataView, options: Parse_Options = {}, deliver?: Deliver, results?: Context_Array) {
        const {byte_offset = 0, little_endian = this.little_endian, context} = options;
        if (results === undefined) {
            results = [];
            results[Symbol.Context_Parent] = context;
        }
        let offset = 0;

        for (const item of this) {
            const {data, size} = item.parse(data_view,
                                            {byte_offset: byte_offset + offset, little_endian, context: results},
                                            (data) => results!.push(data));
            offset += size;
        }
        if (this.decode !== undefined) {
            results = this.decode(results, context);
        }
        if (deliver !== undefined) {
            deliver(results);
        }
        return {data: results, size: offset};
    }
}

type Repeats = number | ((context?: Context) => number);

class Repeat_Class extends Byte_Array_Class {
    repeat: Repeats;

    constructor(repeat: Repeats, options: Array_Options, ...elements: Struct[]) {
        super(options, ...elements);
        this.repeat = repeat;
    }

    /* Basically copy & pasted from Byte_Array_Class with stuff added in the middle. */
    pack(data: any, options: Pack_Options = {}, fetch?: Fetch, fetcher?: Fetch) {
        let {data_view, byte_offset = 0, little_endian = this.little_endian, context = data} = options;
        const repeats = typeof this.repeat === "number" ? this.repeat : this.repeat(context);
        if (fetch !== undefined) {
            data = fetch(data);
        }
        if (this.encode !== undefined) {
            data = this.encode(data, context);
        }
        let offset = 0;
        const packed: Packed[] = [];

        if (fetcher === undefined) {
            const iterator = data[Symbol.iterator]();
            fetcher = () => iterator.next().value;
        }

        for (let count = 0; count < repeats; count++) {
            for (const item of this) {
                const {size, buffer} = item.pack(data, {data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context}, fetcher);
                if (data_view === undefined) {
                    packed.push({size, buffer});
                }
                offset += size;
            }
        }
        if (data_view === undefined) {
            data_view = concat_buffers(packed, offset);
        }
        return {size: offset, buffer: data_view.buffer};
    }

    /* Basically copy & pasted from Byte_Array_Class with stuff added in the middle. */
    parse(data_view: DataView, options: Parse_Options = {}, deliver?: Deliver, results?: Context_Array) {
        const {byte_offset = 0, little_endian = this.little_endian, context} = options;
        if (results === undefined) {
            results = [];
            results[Symbol.Context_Parent] = context;
        }
        let offset = 0;

        const repeats = typeof this.repeat === "number" ? this.repeat : this.repeat(context);
        for (let count = 0; count < repeats; count++) {
            for (const item of this) {
                const {data, size} = item.parse(data_view,
                                                {byte_offset: byte_offset + offset, little_endian, context: results},
                                                (data) => results!.push(data));
                offset += size;
            }
        }
        if (this.decode !== undefined) {
            results = this.decode(results, context);
        }
        if (deliver !== undefined) {
            deliver(results);
        }
        return {data: results, size: offset};
    }
}

/* This would be much cleaner if JavaScript had interfaces. Or I could make everything subclass Struct... */
const extract_array_options = (elements: Array<Struct | Array_Options>) => {

    const options: Array_Options = {};
    if (elements.length > 0) {
        const first = elements[0];
        if (!first.hasOwnProperty('pack') && !first.hasOwnProperty('parse')) {
            Object.assign(options, first);
            elements.shift();
        }
        if (elements.length > 0) {
            const last = elements[elements.length-1];
            if (!last.hasOwnProperty('pack') && !last.hasOwnProperty('parse')) {
                Object.assign(options, last);
                elements.pop();
            }
        }
    }
    return options;
};

export const Byte_Array = (...elements: Array<Struct | Array_Options>) => {
    const options = extract_array_options(elements);
    return new Byte_Array_Class(options, ...elements as Struct[]);
};

export const Repeat = (repeat: Repeats, ...elements: Array<Struct | Array_Options>) => {
    const options = extract_array_options(elements);
    return new Repeat_Class(repeat, options, ...elements as Struct[]);
};

export type Byte_Map = Map<string, Primatives>;
type Map_Options = Transcoders<Byte_Map>;
type Map_Iterable = Array<[string, Struct]>;

interface Byte_Map_Class extends Struct, Map_Options, Map<string, Struct> {}

class Byte_Map_Class extends Map<string, Struct> {
    constructor({encode, decode, little_endian}: Map_Options, iterable?: Map_Iterable) {
        super(iterable);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    pack(data: any, options: Pack_Options = {}, fetch?: Fetch) {
        let {data_view, byte_offset = 0, little_endian = this.little_endian, context = data} = options;
        if (fetch !== undefined) {
            data = fetch(data);
        }
        if (this.encode !== undefined) {
            data = this.encode(data, context);
        }
        const packed: Packed[] = [];
        let offset = 0;
        for (const [key, item] of this) {
            const {size, buffer} = item.pack(data,
                                             {data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context},
                                             (data) => data[key]);
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

    parse(data_view: DataView, options: Parse_Options = {}, deliver?: Deliver, results?: Context_Map) {
        const {byte_offset = 0, little_endian = this.little_endian, context} = options;
        if (results === undefined) {
            results = new Map();
            results[Symbol.Context_Parent] = context;
        }
        let offset = 0;
        for (const [key, item] of this) {
            const {data, size} = item.parse(data_view,
                                              {byte_offset: byte_offset + offset, little_endian, context: results},
                                              (data) => results!.set(key, data));
            offset += size;
        }
        if (this.decode !== undefined) {
            results = this.decode(results, context);
        }
        if (deliver !== undefined) {
            deliver(results);
        }
        return {data: results, size: offset};
    }
}

export const Byte_Map = (options?: Map_Options | Map_Iterable, iterable?: Map_Iterable | Map_Options) => {
    if (options instanceof Array) {
        const _ = iterable;
        iterable = options;
        options = _;
    }
    return new Byte_Map_Class(options as Map_Options || {} , iterable as Map_Iterable);
};
