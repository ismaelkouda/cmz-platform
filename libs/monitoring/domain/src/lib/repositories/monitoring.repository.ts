import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { MonitoringSection } from '../enums/monitoring-section.enum';
import { GrafanaDashboardEntity } from '../entities/grafana-dashboard.entity';

/**
 * Port unique pour les 4 sections `monitoring` — le source avait 4
 * interfaces de repository strictement identiques (`getNode`/`getServices`/
 * `getResources`/`getJobs`, même signature). Consolidé en une seule méthode
 * paramétrée par `MonitoringSection`, cohérent avec le fait que les 4
 * sources HTTP tapent la même ressource (`variables`).
 */
export abstract class MonitoringRepository {
    abstract execute(
        section: MonitoringSection,
        options?: FetchOptions
    ): Observable<GrafanaDashboardEntity>;
}
