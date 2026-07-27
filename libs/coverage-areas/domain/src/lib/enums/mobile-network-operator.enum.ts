export const Operator = {
    MTN: 'MTN',
    ORANGE: 'Orange',
    MOOV: 'Moov',
} as const;
export type Operator = (typeof Operator)[keyof typeof Operator];

const OPERATOR_VALUES = new Set<string>(Object.values(Operator));

export function isOperator(value: unknown): value is Operator {
    return typeof value === 'string' && OPERATOR_VALUES.has(value);
}
