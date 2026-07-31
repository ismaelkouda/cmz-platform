import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { ProcessingAllState } from '@cmz/processing-domain';
import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { allProcessingFilterMapper } from './all-processing-filter.mapper';
import { queuesProcessingFilterMapper } from './queues-processing-filter.mapper';
import { tasksProcessingFilterMapper } from './tasks-processing-filter.mapper';

describe('processing filter mappers', () => {
    it('queuesProcessingFilterMapper traduit un contract validé en snake_case wire', () => {
        const start = new Date('2026-01-01T00:00:00Z');
        const end = new Date('2026-01-31T23:59:59Z');

        expect(
            queuesProcessingFilterMapper({
                initiatorPhoneNumber: '690000001',
                uniqId: 'PROC-001',
                reportType: ReportType.ABI,
                operators: [TelecomOperator.MTN, TelecomOperator.MOOV],
                source: 'sms',
                startDate: start,
                endDate: end,
            })
        ).toEqual({
            initiator_phone_number: '690000001',
            uniq_id: 'PROC-001',
            report_type: ReportType.ABI,
            operators: ['mtn', 'moov'],
            source: 'sms',
            start_date: start,
            end_date: end,
        });
    });

    it('tasksProcessingFilterMapper traduit un contract validé en snake_case wire', () => {
        expect(
            tasksProcessingFilterMapper({
                uniqId: 'PROC-T-001',
                reportType: ReportType.CPS,
                source: 'ivr',
            })
        ).toEqual({
            uniq_id: 'PROC-T-001',
            report_type: ReportType.CPS,
            source: 'ivr',
        });
    });

    it('allProcessingFilterMapper ajoute state au filtre wire', () => {
        expect(
            allProcessingFilterMapper({
                uniqId: 'PROC-ALL-1',
                state: ProcessingAllState.TERMINATED,
            })
        ).toEqual({
            uniq_id: 'PROC-ALL-1',
            state: ProcessingAllState.TERMINATED,
        });
    });
});
