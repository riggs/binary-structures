import { Size } from './serialization';
export declare type Primatives = number | string;
export interface Context_Map extends Map<string, any> {
    [Symbol.Context_Parent]?: Parsed_Context;
}
export interface Context_Array extends Array<any> {
    [Symbol.Context_Parent]?: Parsed_Context;
}
export declare type Parsed_Context = Context_Map | Context_Array;
export declare type Packed_Context = any;
export declare class SerializationError<D> extends Error {
    constructor(message: string, byte_offset?: number, context?: Parsed_Context, data_view?: DataView);
    bytes: string;
    byte_offset: number;
    context?: Parsed_Context;
}
export declare type Encoder<Decoded, Encoded> = (source_data: Decoded, context?: Packed_Context) => Encoded;
export declare type Decoder<Encoded, Decoded> = (parsed_data: Encoded, context?: Parsed_Context) => Decoded;
export interface Transcoders<Encoded, Decoded> {
    encode?: Encoder<Decoded, Encoded>;
    decode?: Decoder<Encoded, Decoded>;
    little_endian?: boolean;
}
export declare const inspect_transcoder: <T>(data: T, context?: any) => T;
export declare const inspect: {
    encode: <T>(data: T, context?: any) => T;
    decode: <T>(data: T, context?: any) => T;
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
    size: Size;
}
export interface Packer<Decoded> {
    <Source>(source_data: Source, options?: Pack_Options, fetch?: Fetch<Source, Decoded>): Packed;
}
export interface Embedded_Array_Packer<Decoded> {
    <S extends Array<any>>(source_data: S, options?: Pack_Options, fetch?: Fetch<S, Decoded>): Packed;
}
export interface Parser<Decoded> {
    (data_view: DataView, options?: Parse_Options, deliver?: Deliver<Decoded>): Parsed<Decoded>;
}
export interface Struct<Decoded> {
    pack: Packer<Decoded>;
    parse: Parser<Decoded>;
}
export interface Meta_Struct<D> {
    pack: Packer<D | null> | Embedded_Array_Packer<D | null>;
    parse: Parser<D | null>;
}
export declare const Bits: <D>(bits: number, transcoders?: Transcoders<number, D>) => Struct<D>;
export declare const Uint: <D>(bits: number, transcoders?: Transcoders<number, D>) => Struct<D>;
export declare const Int: <D>(bits: number, transcoders?: Transcoders<number, D>) => Struct<D>;
export declare const Float: <D>(bits: number, transcoders?: Transcoders<number, D>) => Struct<D>;
export declare const Utf8: <D>(bits: number, transcoders?: Transcoders<string, D>) => Struct<D>;
export declare type Numeric = number | ((context?: Parsed_Context) => number);
/** Byte_Buffer doesn't do any serialization, but just copies bytes to/from an ArrayBuffer that's a subset of the
 * serialized buffer. Byte_Buffer only works on byte-aligned data.
 *
 * @param {Numeric} length
 * @param {Transcoders<ArrayBuffer, any>} transcoders
 */
export declare const Byte_Buffer: <D>(length: Numeric, transcoders?: Transcoders<ArrayBuffer, D>) => Struct<D>;
export declare type Chooser = (context?: Parsed_Context) => Primatives;
export interface Choices<D> {
    [choice: number]: Meta_Struct<D>;
    [choice: string]: Meta_Struct<D>;
}
export declare const Branch: <D>(chooser: Chooser, choices: Choices<D>, default_choice?: Meta_Struct<D> | undefined) => Meta_Struct<D>;
export declare const Embed: <D>(thing: Meta_Struct<D>) => {
    pack: Embedded_Array_Packer<D>;
    parse: Parser<D>;
};
export declare const Padding: (value?: number | {
    bits?: number | undefined;
    bytes?: number | undefined;
}) => Struct<null>;
export declare type Map_Options<D, I> = Transcoders<Map<string, I>, D>;
export declare type Map_Iterable<I> = Array<[string, Meta_Struct<I>]>;
export interface Byte_Map_Class<D, I> extends Struct<D>, Map_Options<D, I>, Map<string, Meta_Struct<I>> {
}
export declare class Byte_Map_Class<D, I> extends Map<string, Meta_Struct<I>> {
    constructor(options?: Map_Options<D, I>, iterable?: Map_Iterable<I>);
    pack<S>(source_data: S, options?: Pack_Options, fetch?: Fetch<S, D>): {
        size: number;
        buffer: ArrayBuffer;
    };
    parse(data_view: DataView, options?: Parse_Options, deliver?: Deliver<D>, results?: Context_Map): {
        data: D;
        size: number;
    };
}
export declare const Byte_Map: <D, I>(options?: Transcoders<Map<string, I>, D> | [string, Meta_Struct<I>][] | undefined, iterable?: Transcoders<Map<string, I>, D> | [string, Meta_Struct<I>][] | undefined) => Byte_Map_Class<D, I>;
export declare type Array_Options<D, I> = Transcoders<Array<I>, D>;
export interface Byte_Array_Class<D, I> extends Struct<D>, Array_Options<D, I>, Array<Meta_Struct<I>> {
}
export declare class Byte_Array_Class<D, I> extends Array<Meta_Struct<I>> {
    constructor(options?: Array_Options<D, I>, ...elements: Array<Meta_Struct<I>>);
    pack<S>(source_data: S, options?: Pack_Options, fetch?: Fetch<S, D>, fetcher?: Fetch<Array<I>, I>): {
        size: number;
        buffer: ArrayBuffer;
    };
    protected __pack_loop<E>(data: E, {data_view, byte_offset, little_endian, context}: Pack_Options, fetcher: Fetch<E, I>, store: (result: Packed) => void): number;
    parse(data_view: DataView, options?: Parse_Options, deliver?: Deliver<D>, results?: Context_Array): {
        data: D;
        size: number;
    };
    protected __parse_loop(data_view: DataView, {byte_offset, little_endian, context}: Parse_Options, deliver: Deliver<I>): number;
}
export declare const Byte_Array: <D, I>(...elements: (Transcoders<I[], D> | Meta_Struct<I>)[]) => Byte_Array_Class<D, I>;
export interface Repeat_Options<D, I> extends Array_Options<D, I> {
    count?: Numeric;
    bytes?: Numeric;
}
export declare class Byte_Repeat<D, I> extends Byte_Array_Class<D, I> {
    count?: Numeric;
    bytes?: Numeric;
    constructor(options: Repeat_Options<D, I>, ...elements: Array<Meta_Struct<I>>);
    protected __pack_loop<E>(data: E, {data_view, byte_offset, little_endian, context}: Pack_Options, fetcher: Fetch<E, I>, store: (result: Packed) => void): number;
    protected __parse_loop(data_view: DataView, {byte_offset, little_endian, context}: Parse_Options, deliver: Deliver<I>): number;
}
export declare const Repeat: <D, I>(...elements: (Repeat_Options<D, I> | Meta_Struct<I>)[]) => Byte_Repeat<D, I>;
