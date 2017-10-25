Map.assign = function (target, ...sources) {
    for (const source of sources) {
        for (const [key, value] of source) {
            target.set(key, value);
        }
    }
    return target;
};
Map.prototype.update = function (...sources) {
    return Map.assign(this, ...sources);
};
Map.prototype.asObject = function () {
    let result = Object.create(null);
    for (let [key, value] of this) {
        result[key] = value;
    }
    return result;
};
//# sourceMappingURL=improved_map.js.map