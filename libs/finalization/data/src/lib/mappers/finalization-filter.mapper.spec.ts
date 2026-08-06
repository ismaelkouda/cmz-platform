import { describe, expect, it } from 'vitest';
import {
    AllFinalizationFilterContract,
    FinalizationAllState,
} from '@cmz/finalization-domain';
import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { allFinalizationFilterMapper } from './all-finalization-filter.mapper';
import { queuesFinalizationFilterMapper } from './queues-finalization-filter.mapper';

describe('finalization filter mappers', () => {
    it('queuesFinalizationFilterMapper traduit un contrat filtre en snake_case wire', () => {
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

        expect(queuesFinalizationFilterMapper(contract)).toEqual({
            initiator_phone_number: '690000001',
            uniq_id: 'PROC-001',
            report_type: ReportType.ABI,
            operators: [TelecomOperator.MTN, TelecomOperator.MOOV],
            source: 'sms',
            start_date: start,
            end_date: end,
        });
    });

    it('allFinalizationFilterMapper ajoute state au filtre wire', () => {
        const contract: AllFinalizationFilterContract = {
            uniqId: 'FIN-ALL-1',
            state: FinalizationAllState.TERMINATED,
        };

        expect(allFinalizationFilterMapper(contract)).toEqual({
            uniq_id: 'FIN-ALL-1',
            state: FinalizationAllState.TERMINATED,
        });
    });
});
