export function buildHttpPayload<
    T extends object,
    K extends readonly (keyof T)[],
>(payload: T, exclude: K): Omit<T, K[number]> {
    const excludedKeys = new Set<keyof T>(exclude);
    return Object.fromEntries(
        Object.entries(payload).filter(
            ([key, value]) =>
                !excludedKeys.has(key as keyof T) &&
                value !== undefined &&
                value !== null &&
                value !== ''
        )
    ) as Omit<T, K[number]>;
}
