# declarative_binary_serialization
Does what it says on the tin.

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


### API
##### Bits(size\[, {encode?, decode?}])

##### Uint(size\[, {encode?, decode?, little_endian?}])
