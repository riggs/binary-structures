# declarative_binary_parser
Does what it says on the tin.

## Example
```
let report = ByteObject({
    Endian: 'little',
    size: Bits(2),
    type: Bits(2, {decode: (value, context) => {
        if (value === 3) {
            throw new Error(`Reserved value ${value} for ${context._identifier}`)
        }
        return value;
    }}),
    tag: Bits(4)
})
```


### API
##### Bits(count[, assertion, transform, endianness])


