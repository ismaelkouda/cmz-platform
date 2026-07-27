export const RadioRelayLinksFrequency = {
    MHZ_900: '900MHZ',
    MHZ_1800: '1800MHZ',
    MHZ_2100: '2100MHZ',
    MHZ_2300: '2300MHZ',
    MHZ_2500: '2500MHZ',
} as const;
export type RadioRelayLinksFrequency =
    (typeof RadioRelayLinksFrequency)[keyof typeof RadioRelayLinksFrequency];

const RADIO_RELAY_LINKS_FREQUENCY_VALUES = new Set<string>(
    Object.values(RadioRelayLinksFrequency)
);

export function isRadioRelayLinksFrequency(
    value: unknown
): value is RadioRelayLinksFrequency {
    return (
        typeof value === 'string' &&
        RADIO_RELAY_LINKS_FREQUENCY_VALUES.has(value)
    );
}
