# declarative_binary_parser
Does what it says on the tin.

## Example
```
let report = new ByteMap()
    .set('Endian', 'little')
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


### API
##### Bits(count[, assertion, transform, endianness])


