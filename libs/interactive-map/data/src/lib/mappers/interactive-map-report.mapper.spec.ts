import { describe, expect, it } from 'vitest';
import type { InteractiveMapReportApiDto } from '../dtos/interactive-map-report-api.dto';
import { InteractiveMapReportMapper } from './interactive-map-report.mapper';

function makeDto(
    partial: Partial<InteractiveMapReportApiDto> = {}
): InteractiveMapReportApiDto {
    return {
        uniq_id: 'RPT-1',
        report_type: 'abi',
        operators: ['MTN', 'Orange'],
        state: 'pending',
        lat: '5.36',
        long: '-4.01',
        region: { name: 'Lagunes' },
        department: 'Abidjan',
        municipality: null,
        reported_at: '2026-07-01T10:00:00Z',
        ...partial,
    };
}

describe('InteractiveMapReportMapper', () => {
    it('mappe le wire vers le VO marqueur (lat/long Number, operators joint)', () => {
        const entity = new InteractiveMapReportMapper().mapFromDto(makeDto());
        expect(entity).toEqual({
            uniqId: 'RPT-1',
            reportType: 'abi',
            operator: 'MTN, Orange',
            state: 'pending',
            latitude: 5.36,
            longitude: -4.01,
            regionName: 'Lagunes',
            departmentName: 'Abidjan',
            municipalityName: undefined,
            reportedAt: '2026-07-01T10:00:00Z',
        });
    });

    it('operators string scalar → String() pas join', () => {
        const entity = new InteractiveMapReportMapper().mapFromDto(
            makeDto({ operators: 'Moov' })
        );
        expect(entity.operator).toBe('Moov');
    });

    it('operators absent → string vide', () => {
        const entity = new InteractiveMapReportMapper().mapFromDto(
            makeDto({ operators: undefined as never })
        );
        expect(entity.operator).toBe('');
    });

    it('uniq_id number → string', () => {
        const entity = new InteractiveMapReportMapper().mapFromDto(
            makeDto({ uniq_id: 42 })
        );
        expect(entity.uniqId).toBe('42');
    });

    it('reported_at null → reportedAt undefined', () => {
        const entity = new InteractiveMapReportMapper().mapFromDto(
            makeDto({ reported_at: null })
        );
        expect(entity.reportedAt).toBeUndefined();
    });

    it('placeName : objet sans name → undefined', () => {
        const entity = new InteractiveMapReportMapper().mapFromDto(
            makeDto({ region: {} })
        );
        expect(entity.regionName).toBeUndefined();
    });
});
