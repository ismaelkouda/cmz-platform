import { describe, expect, it } from 'vitest';
import { MonitoringSection } from '@cmz/monitoring-domain';
import type { MonitoringVariablesItemDto } from '../dtos/monitoring-variables-response.dto';
import { GrafanaDashboardMapper } from './grafana-dashboard.mapper';

const DTO: MonitoringVariablesItemDto = {
    useOfServersResourcesLink: 'https://grafana.example/node-services',
    useOfResourcesLink: 'https://grafana.example/resources',
    impactJobs: 'https://grafana.example/jobs',
};

function envelope(data: MonitoringVariablesItemDto) {
    return { error: false, message: '', data };
}

describe('GrafanaDashboardMapper', () => {
    it.each([
        [MonitoringSection.NODE, DTO.useOfServersResourcesLink],
        [MonitoringSection.SERVICES, DTO.useOfServersResourcesLink],
        [MonitoringSection.RESOURCES, DTO.useOfResourcesLink],
        [MonitoringSection.JOBS, DTO.impactJobs],
    ] as const)(
        'section %s → champ Grafana correspondant',
        (section, expectedLink) => {
            const entity = new GrafanaDashboardMapper(section).mapFromDto(
                envelope(DTO)
            );
            expect(entity.grafanaLink).toBe(expectedLink);
        }
    );
});
