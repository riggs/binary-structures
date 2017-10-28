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

type Primatives = number | string;

interface Map_Context {
    __parent?: Context;
    [arg: string]: any;
}

interface Array_Context extends Array<any> {
    __parent?: Context;
}

type Context = Map_Context | Array_Context;

/* These functions provided by library consumer to convert data to usable structures. */
interface Transcoders<T> {
    encode?: (data: any, context?: Context) => T;
    decode?: (data: T, context?: Context) => any;
    little_endian?: boolean;
}

interface Parse_Options {
    data_view: DataView;
    byte_offset?: number;
    little_endian?: boolean | undefined;
    context?: Context;
}

interface Packer {
    (data: any, options: Parse_Options): Size;
}

interface Parsed<T> {
    data: T;
    size: Size;
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

const factory = (packer: Serializer<Primatives>, parser: Deserializer<Primatives>, verify_size: (size: number) => boolean) => {
    return <Bytes<Primatives>>((size, transcoders) => {
        if(!verify_size(size)) {
            throw new Error(`Invalid size: ${size}`);
        }

        const _little_endian = transcoders !== undefined ? transcoders.little_endian : undefined;
        const encode = transcoders !== undefined ? transcoders.encode : undefined;
        const decode = transcoders !== undefined ? transcoders.decode : undefined;

        const pack: Packer = (data, {data_view, byte_offset = 0, little_endian, context = Object.create(null)}) => {

            if (_little_endian !== undefined) {
                little_endian = _little_endian;
            }
            if (encode !== undefined) {
                data = encode(data, context);
            }
            return packer(data, {size, data_view, byte_offset, little_endian}) / 8;
        };

        const parse: Parser = ({data_view, byte_offset = 0, little_endian, context = Object.create(null)}) => {

            if (_little_endian !== undefined) {
                little_endian = _little_endian;
            }

            let data = parser({size, data_view, byte_offset, little_endian});

            if (decode !== undefined) {
                data = decode(data, context);
            }
            return {data, size: size / 8};
        };
        return {pack, parse};
    });
};

export const Bits: Bytes<number> = factory(uint_pack, uint_parse, (s) => Bits_Sizes.includes(s));

export const Uint: Bytes<number> = factory(uint_pack, uint_parse, (s) => Uint_Sizes.includes(s));

export const Int: Bytes<number> = factory(int_pack, int_parse, (s) => Int_Sizes.includes(s));

export const Float: Bytes<number> = factory(float_pack, float_parse, (s) => Float_Sizes.includes(s));

export const Utf8: Bytes<string> = factory(utf8_pack, utf8_parse, (s) => s % 8 === 0 && s >= 0);

/* A unique marker used to indicate the referenced Structure should be embedded into the parent */
type Embedded = symbol;
let embed_cache = new Map();

type Structure = Struct | Byte_Array_Class | Byte_Map_Class | Embedded;

interface Byte_Array_Class extends Struct, Transcoders<any[]>, Array<Structure> {}

class Byte_Array_Class extends Array<Structure> {
    constructor({encode, decode = Byte_Array_Class.default_decoder, little_endian}: Transcoders<any[]>, ...elements: Structure[]) {
        super(...elements);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    static default_decoder(array: any[], context: Context) {
        return Array.from(array);
    }

    parse({data_view, byte_offset = 0, little_endian = this.little_endian, context = []}: Parse_Options): Parsed<any[]> {
        let offset = 0;
        let array: Array_Context = [];
        array.__parent = context;

        for (const item of this) {
            if (typeof item === 'symbol') {
                const embedded = embed_cache.get(item);
                const {data, size} = embedded.parse({data_view, byte_offset: byte_offset + offset, little_endian, context: array});
                offset += size;
                array.push(...data);
            } else {
                const {data, size} = item.parse({data_view, byte_offset: byte_offset + offset, little_endian, context: array});
                offset += size;
                array.push(data);
            }
        }
        if (this.decode !== undefined) {
            array = this.decode(array, context);
        }
        return {data: array, size: offset};
    };

    pack(data: any, context: Context = {}) {
        const array = Array.from(typeof this.encode === 'function' ? this.encode(data, context) : data);
        return NaN;
    }
}

export const Byte_Array = (options: Transcoders<any[]>, ...elements: Structure[]): Byte_Array_Class => {
    return new Byte_Array_Class(options, ...elements);
};

type Repeater = number | ((context: Context) => number);

export class Repeat_Class extends Byte_Array_Class {
    repeat: Repeater;
    constructor(repeat: Repeater, options: Transcoders<any[]>, ...elements: Structure[]) {
        super(options, ...elements);
        this.repeat = repeat;
    }

    parse({data_view, byte_offset = 0, little_endian = this.little_endian, context = []}: Parse_Options): Parsed<any[]> {
        let offset = 0;
        let array: Array_Context = [];
        array.__parent = context;

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

export const Repeat = (repeat: Repeater, options: Transcoders<any[]>, ...elements: Structure[]): Repeat_Class => {
    return new Repeat_Class(repeat, options, ...elements);
};

/* Keys must all ultimately be strings for safe conversion of Map into Object */
interface Byte_Map_Class extends Struct, Transcoders<Map<string, any>>, Map<string | Embedded, Structure> {}

class Byte_Map_Class extends Map<string | Embedded, Structure> {
    constructor({encode, decode = Byte_Map_Class.default_decoder, little_endian}: Transcoders<Map<string, any>>, iterable?: Array<[string | Embedded, Structure]>) {
        super(iterable);
        this.encode = encode;
        this.decode = decode;
        this.little_endian = little_endian;
    }

    static default_decoder(map: Map<string, any>, context: Context) {
        return map.toObject();
    }

    parse({data_view, byte_offset = 0, little_endian = this.little_endian, context = Object.create(null)}: Parse_Options): Parsed<any> {
        return {data: this.decode!(new Map(), this), size: data_view.buffer.byteLength};  // FIXME: Placeholder for Type checking.
    }
}

export const Byte_Map = (options: Transcoders<Map<string, any>>, iterable?: Array<[string | Embedded, Structure]>) => {
    return new Byte_Map_Class(options, iterable);
};

let embed_counter = 1;
export const Embed: ((thing?: Structure) => Embedded) = (thing) => {
    const symbol = Symbol(embed_counter++);
    embed_cache.set(symbol, thing);
    return symbol;
};
