
interface NumberConstructor {
    readonly MAX_SAFE_INTEGER: number;
    readonly MIN_SAFE_INTEGER: number;
}

interface Text_Encoder {
    readonly encoding: 'utf-8';
    encode(buffer?: string, options?: {stream: boolean}): Uint8Array;
}

interface Text_Encoder_Constructor {
    new (): Text_Encoder;
}

declare const TextEncoder: Text_Encoder_Constructor;

interface Text_Decoder {
    readonly encoding: string;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;
    decode(buffer?: ArrayBuffer | ArrayBufferView, options?: {stream: boolean}): string;
}

interface Text_Decoder_Constructor {
    new (utfLabel?: string, options?: {fatal: boolean, ignoreBOM: boolean}): Text_Decoder;
}

declare const TextDecoder: Text_Decoder_Constructor;

interface Window {
    readonly TextEncoder: Text_Encoder_Constructor;
    readonly TextDecoder: Text_Decoder_Constructor;
}

/* Pushing this to the global object because of a deficiency in typescript. */
interface SymbolConstructor {
    Context_Parent: symbol;
}
