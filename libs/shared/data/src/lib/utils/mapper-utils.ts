export class MapperUtils {
    static createEnumMap<const T extends Record<string, unknown>>(
        mapping: T
    ): ReadonlyMap<keyof T & string, T[keyof T]> {
        const map = new Map<keyof T & string, T[keyof T]>();
        for (const key in mapping) {
            if (Object.prototype.hasOwnProperty.call(mapping, key)) {
                map.set(key, mapping[key]);
            }
        }
        return map;
    }

    private readonly cache = new Map<string, unknown>();
    private readonly maxCacheSize = 1000;

    memoized<TInput, TOutput>(
        input: TInput | null | undefined,
        mapper: (input: TInput) => TOutput,
        key?: string
    ): TOutput | null {
        if (input === null || input === undefined) {
            return null;
        }
        const cacheKey = key ?? this.generateCacheKey(input);
        const cached = this.cache.get(cacheKey);
        if (cached !== undefined) {
            return cached as TOutput;
        }
        const result = mapper(input);
        this.setCache(cacheKey, result);
        return result;
    }

    memoizedList<TInput, TOutput>(
        inputs: readonly TInput[],
        mapper: (input: TInput) => TOutput,
        keyGenerator?: (input: TInput) => string
    ): TOutput[] {
        return inputs
            .map((input) => this.memoized(input, mapper, keyGenerator?.(input)))
            .filter((v): v is TOutput => v !== null);
    }

    private setCache(key: string, value: unknown): void {
        this.cache.set(key, value);
        this.ensureCacheLimit();
    }

    private ensureCacheLimit(): void {
        if (this.cache.size <= this.maxCacheSize) {
            return;
        }
        const overflow = this.cache.size - this.maxCacheSize;
        const keysToDelete = Array.from(this.cache.keys()).slice(0, overflow);
        for (const key of keysToDelete) {
            this.cache.delete(key);
        }
    }

    private generateCacheKey(value: unknown): string {
        if (this.isIdentifiable(value)) {
            return `id:${value.constructor.name}:${value.id}`;
        }
        if (Array.isArray(value)) {
            return `arr:${value.length}`;
        }
        return `${typeof value}:${String(value)}`;
    }

    private isIdentifiable(value: unknown): value is { id: string | number } {
        return (
            typeof value === 'object' &&
            value !== null &&
            'id' in value &&
            (value as { id: unknown }).id !== undefined
        );
    }

    static validateDto<T extends object>(
        dto: T,
        schema: { required?: readonly (keyof T)[] }
    ): void {
        if (!dto || typeof dto !== 'object') {
            throw new Error('DTO must be an object');
        }
        if (schema.required) {
            const missing = schema.required.filter(
                (key) => dto[key] === undefined || dto[key] === null
            );
            if (missing.length) {
                throw new Error(
                    `Missing required fields: ${missing.join(', ')}`
                );
            }
        }
    }

    static validateRequiredFields<T extends object>(
        dto: T,
        fields: readonly (keyof T)[]
    ): void {
        const missing = fields.filter(
            (f) => dto[f] === undefined || dto[f] === null || dto[f] === ''
        );
        if (missing.length) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }

    static syncCollection<T, D>(
        target: T[],
        source: D[],
        getKey: (item: T | D) => string,
        update: (target: T, source: D) => void,
        create: (source: D) => T
    ): void {
        const sourceMap = new Map(source.map((s) => [getKey(s), s]));
        for (let i = target.length - 1; i >= 0; i--) {
            const key = getKey(target[i]);
            const sourceItem = sourceMap.get(key);
            if (!sourceItem) {
                target.splice(i, 1);
            } else {
                update(target[i], sourceItem);
                sourceMap.delete(key);
            }
        }
        for (const sourceItem of sourceMap.values()) {
            target.push(create(sourceItem));
        }
    }

    static mergeImmutable<E, D, K>(
        current: readonly E[],
        incoming: readonly D[],
        key: (item: E | D) => K,
        update: (entity: E, dto: D) => E,
        create: (dto: D) => E
    ): readonly E[] {
        const map = new Map(current.map((e) => [key(e), e]));
        return incoming.map((dto) => {
            const k = key(dto);
            const existing = map.get(k);
            return existing ? update(existing, dto) : create(dto);
        });
    }

    clearCache(): void {
        this.cache.clear();
    }
}
