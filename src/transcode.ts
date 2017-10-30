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

/* Need to hang Parent off the global Symbol because of Typescript deficiency */
Symbol.Parent = Symbol.for("Parent");

interface Context_Object extends Map<string, any>{
    [Symbol.Parent]?: Context;
}

interface Context_Array extends Array<any> {
    [Symbol.Parent]?: Context;
}

type Context = Context_Object | Context_Array;

/* These functions provided by library consumer to convert data to usable structures. */
interface Transcoders<T> {
    encode?: (data: any, context?: Context) => T;
    decode?: (data: T, context?: Context) => any;
    little_endian?: boolean;
}

export const inspect_transcoder = (data: any, context?: Context) => {
    console.log(context);
    return data
};

export const inspect = {
    encode: inspect_transcoder,
    decode: inspect_transcoder,
};

interface Common_Options {
    byte_offset?: number;
    little_endian?: boolean | undefined;
    context?: Context;
}

interface Parse_Options extends Common_Options {
    data_view: DataView;
}

interface Pack_Options extends Common_Options {
    data_view?: DataView;
}

interface Packer {
    (data: any, options: Pack_Options): {size: Size, buffer: ArrayBuffer};
}

interface Parsed<T> {
    data: T;
    size: Size; /* In Bytes */
}

interface Parser {
    (options: Parse_Options): Parsed<any>;
}

interface Struct {
    pack: Packer;
    parse: Parser;
}

interface Bytes<T> {
    (size: number, transcoders?: Transcoders<T>): Struct;
}

const bakery /* factory that makes Bytes */ = (serializer: Serializer<Primatives>, deserializer: Deserializer<Primatives>, verify_size: (bits: number) => boolean) => {
    return <Bytes<Primatives>>((bits, transcoders) => {
        if(!verify_size(bits)) {
            throw new Error(`Invalid size: ${bits}`);
        }

        if (transcoders === undefined) transcoders = {};
        const {encode, decode} = transcoders;

        const pack: Packer = (data, {data_view = new DataView(new ArrayBuffer(bits / 8)), byte_offset = 0, little_endian = transcoders!.little_endian, context}) => {

            if (encode !== undefined) {
                data = encode(data, context);
            }
            const size = (serializer(data, {bits, data_view, byte_offset, little_endian}) / 8);
            return {size, buffer: data_view.buffer};
        };

        const parse: Parser = ({data_view, byte_offset = 0, little_endian = transcoders!.little_endian, context}) => {

            let data = deserializer({bits, data_view, byte_offset, little_endian});

            if (decode !== undefined) {
                data = decode(data, context);
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

/* A unique marker used to indicate the referenced Structure should be embedded into the parent */

let embed = new Map();
export const Embed: ((thing: Byte_Array_Class | Byte_Map_Class) => Struct) = (thing) => {
    const parse_symbol = Symbol();

    /* Don't use the default decoder if the thing is embedded */
    console.log(thing.decode);
    console.log(Object.getPrototypeOf(thing));
    if (thing.decode === default_decoder) {
        thing.decode = undefined;
    }

    const parse: Parser = (options) => {
        const {size, data} = thing.parse(options);
        embed.set(parse_symbol, data);
        return {size, data: parse_symbol};
    };

    // TODO: FIXME Pack also needs special handling.
    return {pack: thing.pack, parse};
};

type Chooser = (context?: Context) => number | string;
interface Choices {
    [choice: number]: Struct;
    [choice: string]: Struct;
}

export const Branch = (choose: Chooser, choices: Choices): Struct => {
    const parse: Parser = (options) => {
        return choices[choose(options.context)].parse(options);
    };

    const pack: Packer = (data, options) => {
        return choices[choose(options.context)].pack(data, options);
    };
    return {parse, pack};
};

/* Declared in this namespace because Object.getPrototypeOf(thing).default_decoder returns undefined. */
const default_decoder = (data: any[] | Map<string, any>) => {
    if (data instanceof Map) {
        return data.toObject();
    }
    return Array.from(data);
};

interface Byte_Array_Class extends Struct, Transcoders<any[]>, Array<Struct> {}

class Byte_Array_Class extends Array<Struct> {
    constructor({encode, decode = default_decoder, little_endian}: Transcoders<any[]>, ...elements: Struct[]) {
        super(...elements);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    parse({data_view, byte_offset = 0, little_endian = this.little_endian, context}: Parse_Options) {
        let offset = 0;
        let array: Context_Array = [];
        array[Symbol.Parent] = context;

        for (const item of this) {
            let {data, size} = item.parse({data_view, byte_offset: byte_offset + offset, little_endian, context: array});
            offset += size;
            if (typeof data === 'symbol') {
                data = embed.pop(data);
                if (!(data instanceof Array)) {
                    throw new Error(`Unable to Embed ${data} into ${this}`)
                }
                array.push(...data);
            } else {
                array.push(data);
            }
        }
        if (this.decode !== undefined) {
            array = this.decode(array, context);
        }
        return {data: array, size: offset};
    };
}

const _extract_options = (elements: Array<Struct | Transcoders<any[]>>) => {
    const options: Transcoders<any[]> = {};
    if (elements.length > 0 && typeof elements[0] !== "symbol") {
        const first = elements[0];
        if (!first.hasOwnProperty('pack') && !first.hasOwnProperty('parse')) {
            Object.assign(options, first);
            elements.shift();
        }
        if (elements.length > 0 && typeof elements[elements.length-1] !== "symbol") {
            const last = elements[elements.length-1];
            if (!last.hasOwnProperty('pack') && !last.hasOwnProperty('parse')) {
                Object.assign(options, last);
                elements.pop();
            }
        }
    }
    return options;
};

export const Byte_Array = (...elements: Array<Struct | Transcoders<any[]>>): Byte_Array_Class => {
    const options = _extract_options(elements);
    return new Byte_Array_Class(options, ...elements as Struct[]);
};

type Repeats = number | ((context?: Context) => number);

class Repeat_Class extends Byte_Array_Class {
    repeat: Repeats;
    constructor(repeat: Repeats, options: Transcoders<any[]>, ...elements: Struct[]) {
        super(options, ...elements);
        this.repeat = repeat;
    }

    parse({data_view, byte_offset = 0, little_endian = this.little_endian, context}: Parse_Options) {
        let offset = 0;
        let array: Context_Array = [];
        array[Symbol.Parent] = context;

        const decode = this.decode;
        this.decode = undefined;

        let count = 0;
        const repeats = typeof this.repeat === "number" ? this.repeat : this.repeat(context);
        while (count < repeats) {
            const {data, size} = super.parse({data_view, byte_offset: byte_offset + offset, little_endian, context: array});
            array.push(...data);
            offset += size;
            count++;
        }

        this.decode = decode;

        if (this.decode !== undefined) {
            array = this.decode(array, context);
        }
        return {data: array, size: offset};
    }
}

export const Repeat = (repeat: Repeats, ...elements: Array<Struct | Transcoders<any[]>>): Repeat_Class => {
    const options = _extract_options(elements);
    return new Repeat_Class(repeat, options, ...elements as Struct[]);
};

/* Keys must all ultimately be strings for safe conversion of Map into Object */
interface Byte_Map_Class extends Struct, Transcoders<Map<string, any>>, Map<string, Struct> {}

class Byte_Map_Class extends Map<string, Struct> {
    constructor({encode, decode = default_decoder, little_endian}: Transcoders<Map<string, any>>, iterable?: Array<[string, Struct]>) {
        super(iterable);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    parse({data_view, byte_offset = 0, little_endian = this.little_endian, context}: Parse_Options) {
        let offset = 0;
        let map: Context_Object = new Map();
        map[Symbol.Parent] = context;

        for (const [key, value] of this) {
            let {data, size} = value.parse({data_view, byte_offset: byte_offset + offset, little_endian, context: map});
            offset += size;
            if (typeof data === 'symbol') {
                data = embed.pop(data);
                console.log(data);
                map.update(data);
            } else {
                map.set(key, data);
            }
        }

        if (this.decode !== undefined) {
            map = this.decode(map, context);
        }

        return {data: map, size: offset};
    }
}

type Map_Options = Transcoders<Map<string, any>>;
type Map_Iterable = Array<[string, Struct]>;

export const Byte_Map = (options?: Map_Options | Map_Iterable, iterable?: Map_Iterable | Map_Options) => {
    if (options instanceof Array) {
        const _ = iterable;
        iterable = options;
        options = _;
    }
    if (options === undefined) {
        options = {};
    }
    return new Byte_Map_Class(options as Map_Options, iterable as Map_Iterable);
};
