import type { SubscribeNewsletterInput } from './models';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationIssue {
    readonly field: string;
    readonly rule: string;
}

export function validateSubscribeNewsletterInput(
    value: SubscribeNewsletterInput
): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (typeof value.email === 'string' && value.email.trim().length === 0)
        issues.push({ field: 'email', rule: 'required' });
    if (!EMAIL_PATTERN.test(value.email))
        issues.push({ field: 'email', rule: 'format:email' });
    return issues;
}
