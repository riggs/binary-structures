import { Size } from './serialization';
export declare type Primitive = number | string | ArrayBuffer;
export declare type Mapped<T> = Map<string, T>;
export declare type Encoded_Map = Mapped<any>;
export declare type Encoded_Array = Array<any>;
export declare type Encoded = Primitive | Encoded_Map | Encoded_Array;
export interface Context<P> {
    $parent?: P;
}
export declare type Parent = '$parent';
export declare const Parent: Parent;
export declare type Context_Type<E extends Encoded, C> = E & Context<C>;
export declare type Context_Map<Encoded, Context> = Context_Type<Mapped<Encoded>, Context>;
export declare type Context_Array<Encoded, Context> = Context_Type<Array<Encoded>, Context>;
export declare type Context_Iterable<Encoded, Context> = Context_Map<Encoded, Context> | Context_Array<Encoded, Context>;
export declare type Encoder<Decoded, E extends Encoded, Context> = (decoded: Decoded, context?: Context) => E;
export declare type Decoder<E extends Encoded, Decoded, Context> = (encoded: E, context?: Context) => Decoded;
export interface Transcoders<E extends Encoded, Decoded, Context> {
    encode?: Encoder<Decoded, E, Context>;
    decode?: Decoder<E, Decoded, Context>;
    little_endian?: boolean;
}
export declare const inspect_transcoder: <T>(data: T, context?: any) => T;
export declare const inspect: {
    encode: <T>(data: T, context?: any) => T;
    decode: <T>(data: T, context?: any) => T;
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
export interface Packer<Decoded, Context> {
    (source: Decoded | Fetcher<Decoded>, options?: Pack_Options<Context>): Packed;
}
export interface Parser<Decoded, Context> {
    (data_view: DataView, options?: Parse_Options<Context>, deliver?: Deliver<Decoded>): Parsed<Decoded>;
}
export interface Struct<Decoded, Context> {
    pack: Packer<Decoded, Context>;
    parse: Parser<Decoded, Context>;
}
export declare const Bits: <D, C>(bits: number, transcoders?: Transcoders<number, D, C>) => Struct<D, C>;
export declare const Uint: <D, C>(bits: number, transcoders?: Transcoders<number, D, C>) => Struct<D, C>;
export declare const Int: <D, C>(bits: number, transcoders?: Transcoders<number, D, C>) => Struct<D, C>;
export declare const Float: <D, C>(bits: number, transcoders?: Transcoders<number, D, C>) => Struct<D, C>;
export declare const Utf8: <D, C>(bits: number, transcoders?: Transcoders<string, D, C>) => Struct<D, C>;
export declare type Numeric<C> = number | {
    bits?: number;
    bytes?: number;
} | ((context?: C) => number);
/** Byte_Buffer doesn't do any serialization, but just copies bytes to/from an ArrayBuffer that's a subset of the
 * serialized buffer. Byte_Buffer only works on byte-aligned data.
 *
 * @param {Numeric} length
 * @param {Transcoders<ArrayBuffer, any>} transcoders
 */
export declare const Byte_Buffer: <D, C>(length: Numeric<C>, transcoders?: Transcoders<ArrayBuffer, D, C>) => {
    pack: (source: D | Fetcher<D>, options?: Pack_Options<C>) => Packed;
    parse: (data_view: DataView, options?: Parse_Options<C>, deliver?: Deliver<D> | undefined) => {
        data: D;
        size: number;
    };
};
export declare const Padding: <C>(size: Numeric<C>) => Struct<any, C>;
export declare type Chooser<C> = (context?: C) => number | string;
export interface Choices<D, C> {
    [choice: number]: Struct<D, C>;
    [choice: string]: Struct<D, C>;
}
export declare const Branch: <D, C>({chooser, choices, default_choice}: {
    chooser: Chooser<C>;
    choices: Choices<D, C>;
    default_choice?: Struct<D, C> | undefined;
}) => Struct<D, C>;
export declare const Embed: <D, C extends Context_Iterable<D, S>, S>(embedded: Struct<Context_Iterable<D, S>, S> | Struct<D, C>) => Struct<D | Context_Type<Map<string, D>, S> | Context_Type<D[], S>, C>;
export declare type Map_Item<I> = Struct<I, Mapped<I>>;
export declare type Map_Iterable<I> = Array<[string, Map_Item<I>]>;
export declare type Map_Transcoders<I, D, C> = Transcoders<Mapped<I>, D, C>;
export interface Binary_Map<I, D, C> extends Mapped<Map_Item<I>>, Struct<D, C> {
    pack: (source: D | Fetcher<D>, options?: Pack_Options<C>, encoded?: Context_Map<I, C>) => Packed;
    parse: (data_view: DataView, options?: Parse_Options<C>, deliver?: Deliver<D>, results?: Context_Map<I, C>) => Parsed<D>;
}
export declare const Binary_Map: <I, D, C>(transcoders?: Transcoders<Map<string, I>, D, C> | [string, Struct<I, Map<string, I>>][], iterable?: Transcoders<Map<string, I>, D, C> | [string, Struct<I, Map<string, I>>][] | undefined) => Binary_Map<I, D, C>;
export declare type Array_Item<I> = Struct<I, Array<I>>;
export declare type Array_Transcoders<I, D, C> = Transcoders<Array<I>, D, C>;
export interface Binary_Array<I, D, C> extends Array<Array_Item<I>>, Struct<D, C> {
    pack: (source: D | Fetcher<D>, options?: Pack_Options<C>, fetcher?: Fetcher<I>) => Packed;
    __pack_loop: (fetcher: Fetcher<I>, options: Pack_Options<Array<I>>, store: (result: Packed) => void, parent?: C) => number;
    parse: (data_view: DataView, options?: Parse_Options<C>, deliver?: Deliver<D>, results?: Context_Array<I, C>) => Parsed<D>;
    __parse_loop: (data_view: DataView, options: Parse_Options<Context_Array<I, C>>, deliver: Deliver<I>, parent?: C) => number;
}
export declare const Binary_Array: <I, D, C>(...elements: (Transcoders<I[], D, C> | Struct<I, I[]>)[]) => Binary_Array<I, D, C>;
export interface Repeat_Options<I, D, C> extends Array_Transcoders<I, D, C> {
    count?: Numeric<C>;
    bytes?: Numeric<C>;
}
export declare const Repeat: <I, D, C>(...elements: (Repeat_Options<I, D, C> | Struct<I, I[]>)[]) => Binary_Array<I, D, C>;
