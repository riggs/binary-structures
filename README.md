# binary-structures
Yet another declarative binary parser/packer, but built for modern browsers.

Specifically, built to support WebUSB.

Documentation is coming, check the tests for examples for now.

Test branch coverage is ~75%, which will also be improving along with the documentation.

## Example
```
let report = Binary_Map({little_endian: true})
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
### Bits
`Bits(size: 1-7 \[, {encode?, decode?}])`

### Uint
`Uint(size: 8 | 16 | 32 | 64 \[, {encode?, decode?, little_endian?}])`

### Int
`Int(size: 8 | 16 | 32 | 64 \[, {encode?, decode?, little_endian?}])`

### Repeat
`Repeat({count?: Numeric, bytes?: Numeric, encode?, decode?, little_endian?}, ...elements)`:
One of either `count` or `bytes` must be provided.

Repeat will repeatedly iterate through `elements`:
* If `count` is specified, it will repeat `count` times.
* If `bytes` is specified, it will repeat until `bytes` bytes have been consumed.
An error will be thrown if `bytes` isn't a multiple of the size of `elements`.
