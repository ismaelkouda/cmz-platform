/**
 * Canal d'origine d'un signalement — codes stables = wire API.
 * Labels : @cmz/shared-ui. Couvre tout le DTO (pwa, unknown inclus).
 */
export const ReportSource = {
    APP: 'app',
    PWA: 'pwa',
    USSD: 'ussd',
    SMS: 'sms',
    IVR: 'ivr',
} as const;

export type ReportSource = (typeof ReportSource)[keyof typeof ReportSource];

const VALUES = new Set<string>(Object.values(ReportSource));

export function isReportSource(value: string): value is ReportSource {
    return VALUES.has(value);
}
