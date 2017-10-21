
interface ContextFunction<V, R> {
    (value: V, context: any): R;
}

/** These functions used internally to the library to pack/unpack ArrayBuffers. */
interface Struct {
    pack: ContextFunction<number, DataView>,
    unpack: ContextFunction<DataView, number>,
    little_endian?: boolean | undefined
}

/** These functions provided by library consumer to convert data to usable structures. */
interface Transcoder<E /* Encoded Type */, D /* Decoded Type */> {
    encode?: ContextFunction<D, E>,
    decode?: ContextFunction<E, D>,
    little_endian?: boolean | undefined
}

interface ByteArray extends Transcoder<DataView, any> {
    [index: number]: Struct | ByteObject | ByteArray | undefined
}

interface ByteObject extends Transcoder<DataView, any> {
    [name: string]: Struct | ByteObject | ByteArray | undefined | boolean | ContextFunction<any, any>
}


