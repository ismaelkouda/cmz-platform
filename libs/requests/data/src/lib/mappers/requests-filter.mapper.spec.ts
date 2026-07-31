import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import {
    AllRequestsFilterContract,
    RequestsAllStatus,
} from '@cmz/requests-domain';
import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { allRequestsFilterMapper } from './all-requests-filter.mapper';
import { queuesRequestsFilterMapper } from './queues-requests-filter.mapper';

describe('requests filter mappers', () => {
    it('queuesRequestsFilterMapper traduit un contrat filtre en snake_case wire', () => {
        const start = new Date('2026-01-01T00:00:00Z');
        const end = new Date('2026-01-31T23:59:59Z');
        const contract = {
            initiatorPhoneNumber: '690000001',
            uniqId: 'PROC-001',
            reportType: ReportType.ABI,
            operators: [TelecomOperator.MTN, TelecomOperator.MOOV],
            source: 'sms',
            startDate: start,
            endDate: end,
        };

        expect(queuesRequestsFilterMapper(contract)).toEqual({
            initiator_phone_number: '690000001',
            uniq_id: 'PROC-001',
            report_type: ReportType.ABI,
            operators: [TelecomOperator.MTN, TelecomOperator.MOOV],
            source: 'sms',
            start_date: start,
            end_date: end,
        });
    });

    it('allRequestsFilterMapper ajoute status au filtre wire', () => {
        const contract: AllRequestsFilterContract = {
            uniqId: 'REQ-ALL-1',
            status: RequestsAllStatus.TERMINATED,
        };

        expect(allRequestsFilterMapper(contract)).toEqual({
            uniq_id: 'REQ-ALL-1',
            status: RequestsAllStatus.TERMINATED,
        });
    });
});
