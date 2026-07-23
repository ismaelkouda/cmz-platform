import { isAfter, isValid, parseISO } from 'date-fns';

export interface DateRangeResult {
    startDate?: Date;
    endDate?: Date;
    isValidRange: boolean;
}

export function parseAndValidateDateRange(
    start?: string,
    end?: string
): DateRangeResult {
    const startDate = start ? parseISO(start) : undefined;
    const endDate = end ? parseISO(end) : undefined;

    // Non comparable (borne absente ou invalide) => considéré valide (source).
    if (!startDate || !isValid(startDate) || !endDate || !isValid(endDate)) {
        return { startDate, endDate, isValidRange: true };
    }
    return { startDate, endDate, isValidRange: !isAfter(startDate, endDate) };
}
