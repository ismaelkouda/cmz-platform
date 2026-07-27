export const FiberType = {
    SINGLE_MODE: 'single-mode',
    MULTI_MODE: 'multi-mode',
} as const;
export type FiberType = (typeof FiberType)[keyof typeof FiberType];

const FIBER_TYPE_VALUES = new Set<string>(Object.values(FiberType));

export function isFiberType(value: unknown): value is FiberType {
    return typeof value === 'string' && FIBER_TYPE_VALUES.has(value);
}
