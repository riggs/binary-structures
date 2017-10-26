
test("Map.assign updates target with from multiple sources", () => {
    const map = new Map();
    const result = Map.assign(map, new Map([['a', 1], ['b', 2]]), new Map([['a', 42], ['c', 3]]));
    expect(result).toEqual(map);
    expect(map).toEqual(new Map([['a', 42], ['b', 2], ['c', 3]]));
});

test("Map.prototype.update updates from multiple sources", () => {
    const map = new Map();
    const result = map.update(new Map([['a', 1], ['b', 2]]), new Map([['a', 42], ['c', 3]]));
    expect(result).toEqual(map);
    expect(map).toEqual(new Map([['a', 42], ['b', 2], ['c', 3]]));
});

test("Map.prototype.toObject returns the correct object", () => {
    const sym = Symbol();
    /* Typescript's MapConstructor can't handle these types in an array literal */
    const map = new Map().set('a', 1).set('b', 42).set(0, 0).set(sym, 'symbol');
    expect(map.toObject()).toEqual({a: 1, b: 42, '0': 0, sym: 'symbol'});
});
