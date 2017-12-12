import { Size } from './serialization';
export declare type Primitive = number | string | ArrayBuffer;
export declare const Context: symbol;
export interface Context<P> {
    [Symbol.Context]?: P;
}
export declare type Contextualized<E extends Context<P>, P> = E;
export declare type Mapped<T> = Map<string, T>;
export declare type Context_Type<E, Parent> = Contextualized<E & Context<Parent>, Parent>;
export declare type Context_Map<Encoded, Parent> = Context_Type<Mapped<Encoded>, Parent>;
export declare type Context_Array<Encoded, Parent> = Context_Type<Array<Encoded>, Parent>;
export declare type Encoder<Decoded, Encoded> = <Context>(decoded: Decoded, context?: Context) => Encoded;
export declare type Decoder<Encoded, Decoded> = <Context>(encoded: Encoded, context?: Context) => Decoded;
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
export interface Common_Options<Context> {
    byte_offset?: number;
    little_endian?: boolean;
    context?: Context;
}
export interface Parse_Options<C> extends Common_Options<C> {
}
export interface Pack_Options<C> extends Common_Options<C> {
    data_view?: DataView;
}
export interface Packed {
    buffer: ArrayBuffer;
    size: Size;
}
export interface Parsed<Decoded> {
    data: Decoded;
    size: Size;
}
export interface Packer<Source, Decoded> {
    <Context>(source_data: Source | Decoded, options?: Pack_Options<Context>, fetch?: Fetcher<Source, Decoded>): Packed;
}
export interface Parser<Source, Decoded> {
    (data_view: DataView, options?: Parse_Options<Source>, deliver?: Deliver<Decoded>): Parsed<Decoded>;
}
export interface Struct<Source, Decoded> {
    pack: Packer<Source, Decoded>;
    parse: Parser<Source, Decoded>;
}
export declare const Bits: <S, D>(bits: number, transcoders?: Transcoders<number, D>) => Struct<S, D>;
export declare const Uint: <S, D>(bits: number, transcoders?: Transcoders<number, D>) => Struct<S, D>;
export declare const Int: <S, D>(bits: number, transcoders?: Transcoders<number, D>) => Struct<S, D>;
export declare const Float: <S, D>(bits: number, transcoders?: Transcoders<number, D>) => Struct<S, D>;
export declare const Utf8: <S, D>(bits: number, transcoders?: Transcoders<string, D>) => Struct<S, D>;
export declare type Numeric<T> = number | {
    bits?: number;
    bytes?: number;
} | (<P>(context?: Contextualized<T, P>) => number);
/** Byte_Buffer doesn't do any serialization, but just copies bytes to/from an ArrayBuffer that's a subset of the
 * serialized buffer. Byte_Buffer only works on byte-aligned data.
 *
 * @param {Numeric} length
 * @param {Transcoders<ArrayBuffer, any>} transcoders
 */
export declare const Byte_Buffer: <S, D, P>(length: Numeric<S | D>, transcoders?: Transcoders<ArrayBuffer, D>) => Struct<S, D>;
export declare const Padding: <S, P>(size: Numeric<S>) => Struct<S, any>;
export declare type Chooser<T, P> = (context?: Contextualized<T, P>) => number | string;
export interface Choices<S, D> {
    [choice: number]: Struct<S, D>;
    [choice: string]: Struct<S, D>;
}
export declare const Branch: <S, D, P>(chooser: Chooser<S | D, P>, choices: Choices<S, D>, default_choice?: Struct<S, D> | undefined) => Struct<S, D>;
export interface Embed_Packer<S, D, I> {
    <P>(source_data: Contextualized<S | D, P>, options?: Pack_Options, fetch?: Fetcher<Array<I>, I>): Packed;
    <P>(source_data: Contextualized<S | D, P>, options?: Pack_Options, fetch?: Fetcher<Contextualized<S, P>, D>): Packed;
}
export interface Embed_Parser<Source, Decoded> {
    (data_view: DataView, options?: Parse_Options<Source>, deliver?: Deliver<Decoded>): Parsed<Decoded>;
}
export declare const Embed: <S, D, I>(embedded: Struct<S, D>) => {
    pack: <P>(source_data: S | D, options?: any, fetch?: Fetcher<S, D> | Fetcher<I[], I> | undefined) => Packed;
    parse: (data_view: DataView, options?: Parse_Options<S> | Parse_Options<(I[] & Context<S>) | (Map<string, I> & Context<S>)>, deliver?: Deliver<D> | undefined) => Parsed<D>;
};
export declare type Map_Item<I> = Struct<Mapped<I>, I>;
export declare type Map_Iterable<I> = Array<[string, Map_Item<I>]>;
export declare type Map_Transcoders<D, I> = Transcoders<Mapped<I>, D>;
export interface Binary_Map<S, D, I> extends Mapped<Map_Item<I>>, Struct<S, D> {
    parse: (data_view: DataView, options?: Parse_Options<S>, deliver?: Deliver<D>, results?: Context_Map<I, S>) => Parsed<D>;
}
export declare const Binary_Map: <S, D, I>(transcoders?: Transcoders<Map<string, I>, D> | [string, Struct<Map<string, I>, I>][], iterable?: Transcoders<Map<string, I>, D> | [string, Struct<Map<string, I>, I>][] | undefined) => Binary_Map<S, D, I>;
export declare type Array_Item<I> = Struct<Array<I>, I>;
export declare type Array_Transcoders<D, I> = Transcoders<Array<I>, D>;
export interface Binary_Array<S, D, I> extends Array<Array_Item<I>>, Struct<S, D> {
    pack: <P>(source_data: Contextualized<S | D, P>, options?: Pack_Options, fetch?: Fetcher<Contextualized<S, P>, D>, fetcher?: Fetcher<Array<I>, I>) => Packed;
    __pack_loop: (data: Array<I>, {data_view, byte_offset, little_endian}: Pack_Options, fetcher: Fetcher<Array<I>, I>, store: (result: Packed) => void) => number;
    parse: (data_view: DataView, options?: Parse_Options<S>, deliver?: Deliver<D>, results?: Context_Array<I, S>) => Parsed<D>;
    __parse_loop: (data_view: DataView, {byte_offset, little_endian, context}: Parse_Options<Context_Array<I, S>>, deliver: Deliver<I>) => number;
}
export declare const Binary_Array: <S, D, I>(...elements: (Transcoders<I[], D> | Struct<I[], I>)[]) => Binary_Array<S, D, I>;
export interface Repeat_Options<S, D, I> extends Array_Transcoders<D, I> {
    count?: Numeric<Context_Array<I, S>>;
    bytes?: Numeric<Context_Array<I, S>>;
}
export declare const Repeat: <S, D, I>(...elements: (Repeat_Options<S, D, I> | Struct<I[], I>)[]) => Binary_Array<S, D, I>;
