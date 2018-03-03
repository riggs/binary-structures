export declare const hex: (value: number) => string;
export declare const hex_buffer: (buffer: ArrayBuffer) => string;
export declare const Bits_Sizes: number[];
export declare const Uint_Sizes: number[];
export declare const Int_Sizes: number[];
export declare const Float_Sizes: number[];
export declare type Size = number;
export interface Serialization_Options {
    bits: Size;
    byte_offset?: number;
    data_view: DataView;
    little_endian?: boolean;
}
export declare type Numeric = number | string;
export interface Serializer<T> {
    (value: T, options: Serialization_Options): Size;
}
export interface Deserializer<T> {
    (options: Serialization_Options): T;
}
export declare const uint_pack: Serializer<Numeric>;
export declare const uint_parse: Deserializer<number>;
export declare const int_pack: Serializer<Numeric>;
export declare const int_parse: Deserializer<number>;
export declare const float_pack: Serializer<Numeric>;
export declare const float_parse: Deserializer<number>;
export declare const utf8_pack: Serializer<string>;
export declare const utf8_parse: Deserializer<string>;
