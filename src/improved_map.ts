
interface MapConstructor {
    assign(target: Map<any, any>, ...sources: Array<Map<any, any> | Array<[any, any]>>): Map<any, any>
}

interface Map<K, V> {
    update(...sources: Array<Map<any, any> | Array<[any, any]>>): Map<K, V>
    toObject(): any
}

Map.assign = function(target, ...sources) {
    for (const source of sources) {
        for (const [key, value] of source) {
            target.set(key, value)
        }
    }
    return target;
};

Map.prototype.update = function(...sources) {
    return Map.assign(this, ...sources);
};

Map.prototype.toObject = function () {
    const result: any = Object.create(null);
    for (const [key, value] of this) {
        if (typeof key === "string" || typeof key === "symbol") {
            result[key] = value;
        } else {
            result[key.toString()] = value;
        }
    }
    return result
};
