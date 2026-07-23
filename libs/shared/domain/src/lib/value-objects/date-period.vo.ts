import { InvalidDateRangeError } from '../errors/date-period/invalid-date-range.error';
import { InvalidEndDateError } from '../errors/date-period/invalid-end-date.error';
import { InvalidStartDateError } from '../errors/date-period/invalid-start-date.error';

export class DatePeriod {
    public readonly start?: Date;
    public readonly end?: Date;

    private constructor(start?: Date, end?: Date) {
        this.start = start;
        this.end = end;
    }

    static create(start?: string | null, end?: string | null): DatePeriod {
        const startDate = start ? new Date(start) : undefined;
        const endDate = end ? new Date(end) : undefined;

        if (startDate && Number.isNaN(startDate.getTime())) {
            throw new InvalidStartDateError();
        }

        if (endDate && Number.isNaN(endDate.getTime())) {
            throw new InvalidEndDateError();
        }

        if (startDate && endDate && startDate > endDate) {
            throw new InvalidDateRangeError();
        }

        return new DatePeriod(startDate, endDate);
    }

    static createOptional(
        start?: string | null,
        end?: string | null
    ): DatePeriod | null {
        if (!start && !end) {
            return null;
        }

        return DatePeriod.create(start, end);
    }
}
