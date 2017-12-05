# declarative-binary-serialization
Does what it says on the tin.

It works, I just need to write more tests and document it.

## Example
```
let report = Byte_Map({little_endian: true})
    .set('size', Bits(2))
    .set('type', Bits(2, {decode: (value, context) => {
        if (value === 3) {
            throw new Error(`Reserved value ${value} for ${context._identifier}`)
        }
        return value;
    }}))
    .set('tag', Bits(4))
})
```


## API
### Bits(size\[, {encode?, decode?}])

### Uint(size\[, {encode?, decode?, little_endian?}])

### Repeat
Repeat({count?: Numeric, bytes?: Numeric, encode?, decode?, little_endian?}, ...elements)
One of either `count` or `bytes` must be provided.

Repeat will repeatedly iterate through `elements`:
* If `count` is specified, it will repeat `count` times.
* If `bytes` is specified, it will repeat until `bytes` bytes have been consumed.
An error will be thrown if `bytes` isn't a multiple of the size of `elements`.
