import { DateRangeInvalidError } from '../errors/validation/date-range-invalid.error';

/**
 * Assertion partagée : lève DateRangeInvalidError si les deux bornes sont
 * fournies et que startDate est postérieure à endDate.
 */
export function assertValidDateRange(startDate?: Date, endDate?: Date): void {
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
        throw new DateRangeInvalidError();
    }
}
