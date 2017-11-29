import { Size } from './serialization';
export declare type Primatives = number | string;
export interface Context_Map extends Map<string, any> {
    [Symbol.Context_Parent]?: Context;
}
export interface Context_Array extends Array<any> {
    [Symbol.Context_Parent]?: Context;
}
export declare type Context = Context_Map | Context_Array;
export declare type Encoder<T> = (data: any, context?: any) => T;
export declare type Decoder<T> = (data: T, context?: Context) => any;
export interface Transcoders<T> {
    encode?: Encoder<T>;
    decode?: Decoder<T>;
    little_endian?: boolean;
}
export declare const inspect_transcoder: (data: any, context?: Context_Map | Context_Array | undefined) => any;
export declare const inspect: {
    encode: (data: any, context?: Context_Map | Context_Array | undefined) => any;
    decode: (data: any, context?: Context_Map | Context_Array | undefined) => any;
};
export interface Parse_Options {
    byte_offset?: number;
    little_endian?: boolean | undefined;
    context?: Context;
}
export interface Pack_Options extends Parse_Options {
    data_view?: DataView;
}
/** A function to fetch the data to be packed.
 *  It is provided by the code handling the data input and called by the packer function to fetch the data to pack.
 */
export interface Fetch {
    (data: any): any;
}
export interface Packed {
    size: Size;
    buffer: ArrayBuffer;
}
export interface Packer {
    (data: any, options?: Pack_Options, fetch?: Fetch): Packed;
}
/** A function to deliver the parsed result to the correct place.
 *  It is provided by the code managing the results container and called by the parser function with the parsed data.
 */
export interface Deliver {
    (data: any): void;
}
export interface Parsed {
    data: any;
    size: Size;
}
export interface Parser {
    (data_view: DataView, options?: Parse_Options, deliver?: Deliver): Parsed;
}
export interface Struct {
    pack: Packer;
    parse: Parser;
}
export interface Bytes<T> {
    (size: number, transcoders?: Transcoders<T>): Struct;
}
export declare const Bits: Bytes<number>;
export declare const Uint: Bytes<number>;
export declare const Int: Bytes<number>;
export declare const Float: Bytes<number>;
export declare const Utf8: Bytes<string>;
export declare type Chooser = (context?: Context) => number | string;
export interface Choices {
    [choice: number]: Struct;
    [choice: string]: Struct;
}
export declare const Branch: (choose: Chooser, choices: Choices) => Struct;
export declare const Embed: (thing: Struct | Byte_Array_Class | Byte_Map_Class) => Struct;
export declare const Padding: ({bits, bytes}: {
    bits?: number;
    bytes?: number;
}) => Struct;
export declare type Byte_Array = Array<Primatives>;
export declare type Array_Options = Transcoders<Byte_Array>;
export interface Byte_Array_Class extends Struct, Array_Options, Array<Struct> {
}
export declare class Byte_Array_Class extends Array<Struct> {
    constructor({encode, decode, little_endian}: Array_Options, ...elements: Struct[]);
    pack(data: any, options?: Pack_Options, fetch?: Fetch, fetcher?: Fetch): {
        size: number;
        buffer: ArrayBuffer;
    };
    parse(data_view: DataView, options?: Parse_Options, deliver?: Deliver, results?: Context_Array): {
        data: Context_Array | undefined;
        size: number;
    };
}
export declare type Repeats = number | ((context?: Context) => number);
export declare class Repeat_Class extends Byte_Array_Class {
    repeat: Repeats;
    constructor(repeat: Repeats, options: Array_Options, ...elements: Struct[]);
    pack(data: any, options?: Pack_Options, fetch?: Fetch, fetcher?: Fetch): {
        size: number;
        buffer: ArrayBuffer;
    };
    parse(data_view: DataView, options?: Parse_Options, deliver?: Deliver, results?: Context_Array): {
        data: Context_Array | undefined;
        size: number;
    };
}
export declare const Byte_Array: (...elements: (Struct | Transcoders<(string | number)[]>)[]) => Byte_Array_Class;
export declare const Repeat: (repeat: Repeats, ...elements: (Struct | Transcoders<(string | number)[]>)[]) => Repeat_Class;
export declare type Byte_Map = Map<string, Primatives>;
export declare type Map_Options = Transcoders<Byte_Map>;
export declare type Map_Iterable = Array<[string, Struct]>;
export interface Byte_Map_Class extends Struct, Map_Options, Map<string, Struct> {
}
export declare class Byte_Map_Class extends Map<string, Struct> {
    constructor({encode, decode, little_endian}: Map_Options, iterable?: Map_Iterable);
    pack(data: any, options?: Pack_Options, fetch?: Fetch): {
        size: number;
        buffer: ArrayBuffer;
    };
    parse(data_view: DataView, options?: Parse_Options, deliver?: Deliver, results?: Context_Map): {
        data: Context_Map | undefined;
        size: number;
    };
}
export declare const Byte_Map: (options?: Transcoders<Map<string, string | number>> | [string, Struct][] | undefined, iterable?: Transcoders<Map<string, string | number>> | [string, Struct][] | undefined) => Byte_Map_Class;
