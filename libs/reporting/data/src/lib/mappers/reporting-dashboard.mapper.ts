import { SimpleResponseMapper } from '@cmz/shared-data';
import { GrafanaLinkEntity } from '@cmz/shared-domain';
import { ReportingSection } from '@cmz/reporting-domain';
import { ReportingVariablesItemDto } from '../dtos/reporting-variables-response.dto';

const REPORTING_SECTION_FIELD: Record<
    ReportingSection,
    keyof ReportingVariablesItemDto
> = {
    [ReportingSection.REPORT]: 'reportReportingLink',
    [ReportingSection.REQUESTS]: 'requestReportReportingLink',
    [ReportingSection.REPORT_BY_CHANNEL]: 'reportByChannel',
    [ReportingSection.REPORT_BY_OPERATOR]: 'reportByOperator',
};

export class ReportingDashboardMapper extends SimpleResponseMapper<
    GrafanaLinkEntity,
    ReportingVariablesItemDto
> {
    constructor(private readonly section: ReportingSection) {
        super();
    }

    protected override mapItemFromDto(
        dto: ReportingVariablesItemDto
    ): GrafanaLinkEntity {
        const field = REPORTING_SECTION_FIELD[this.section];
        return new GrafanaLinkEntity(dto[field] ?? '');
    }
}
