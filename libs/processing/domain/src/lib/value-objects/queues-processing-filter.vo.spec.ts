import { describe, expect, it } from 'vitest';
import { ReportType } from '@cmz/shared-domain';
import { queuesProcessingFilterVo } from './queues-processing-filter.vo';

describe('queuesProcessingFilterVo', () => {
    it('trimme source et uniqId comme le legacy QueuesFilterVo', () => {
        const vo = queuesProcessingFilterVo({
            source: '  sms  ',
            uniqId: '  PROC-1  ',
            reportType: ReportType.ABI,
        });

        expect(vo.source).toBe('sms');
        expect(vo.uniqId).toBe('PROC-1');
    });
});
