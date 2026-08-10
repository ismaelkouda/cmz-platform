import { SimpleResponseMapper } from '@cmz/shared-data';
import { GrafanaLinkEntity } from '@cmz/shared-domain';
import { MonitoringSection } from '@cmz/monitoring-domain';
import { MonitoringVariablesItemDto } from '../dtos/monitoring-variables-response.dto';

/**
 * Quel champ de la réponse `variables` correspond à quelle section — le
 * jeu de correspondances explicite que les 4 mappers du source dupliquaient
 * en 4 classes distinctes (`NodeMapper`/`ServicesMapper`/`ResourcesMapper`/
 * `JobsMapper`, chacune un simple accès de champ figé).
 */
const MONITORING_SECTION_FIELD: Record<
    MonitoringSection,
    keyof MonitoringVariablesItemDto
> = {
    [MonitoringSection.NODE]: 'useOfServersResourcesLink',
    [MonitoringSection.SERVICES]: 'useOfServersResourcesLink',
    [MonitoringSection.RESOURCES]: 'useOfResourcesLink',
    [MonitoringSection.JOBS]: 'impactJobs',
};

/**
 * Le mapper `jobs` du source contenait un `console.log('dto impactJobs: ',
 * dto)` de debug, jamais retiré — non reproduit ici.
 */
export class GrafanaDashboardMapper extends SimpleResponseMapper<
    GrafanaLinkEntity,
    MonitoringVariablesItemDto
> {
    constructor(private readonly section: MonitoringSection) {
        super();
    }

    protected override mapItemFromDto(
        dto: MonitoringVariablesItemDto
    ): GrafanaLinkEntity {
        const field = MONITORING_SECTION_FIELD[this.section];
        return new GrafanaLinkEntity(dto[field]);
    }
}
