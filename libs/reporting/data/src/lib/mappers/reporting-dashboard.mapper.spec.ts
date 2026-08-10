import { describe, expect, it } from 'vitest';
import { ReportingSection } from '@cmz/reporting-domain';
import type { ReportingVariablesItemDto } from '../dtos/reporting-variables-response.dto';
import { ReportingDashboardMapper } from './reporting-dashboard.mapper';

const DTO: ReportingVariablesItemDto = {
    reportReportingLink: 'https://grafana.example/report',
    requestReportReportingLink: 'https://grafana.example/requests',
    reportByChannel: 'https://grafana.example/channel',
    reportByOperator: 'https://grafana.example/operator',
};

function envelope(data: ReportingVariablesItemDto) {
    return { error: false, message: '', data };
}

describe('ReportingDashboardMapper', () => {
    it.each([
        [ReportingSection.REPORT, DTO.reportReportingLink],
        [ReportingSection.REQUESTS, DTO.requestReportReportingLink],
        [ReportingSection.REPORT_BY_CHANNEL, DTO.reportByChannel],
        [ReportingSection.REPORT_BY_OPERATOR, DTO.reportByOperator],
    ] as const)(
        'section %s → champ Grafana correspondant',
        (section, expectedLink) => {
            const entity = new ReportingDashboardMapper(section).mapFromDto(
                envelope(DTO)
            );
            expect(entity.grafanaLink).toBe(expectedLink);
        }
    );

    it('fallback ?? "" si le champ section est nullish', () => {
        const partial = {
            reportReportingLink: undefined,
            requestReportReportingLink: 'https://ok',
            reportByChannel: 'https://ok',
            reportByOperator: 'https://ok',
        } as unknown as ReportingVariablesItemDto;
        const entity = new ReportingDashboardMapper(
            ReportingSection.REPORT
        ).mapFromDto(envelope(partial));
        expect(entity.grafanaLink).toBe('');
    });
});
