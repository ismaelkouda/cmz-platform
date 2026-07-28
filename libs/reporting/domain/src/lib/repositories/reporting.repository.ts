import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ReportingSection } from '../enums/reporting-section.enum';
import { GrafanaDashboardEntity } from '../entities/grafana-dashboard.entity';

/**
 * Port unique pour les 4 sections `reporting` — le source avait 4
 * interfaces de repository strictement identiques (getReport/getRequests/
 * getReportByChannel/getReportByOperator, même signature). Consolidé en une seule méthode
 * paramétrée par `ReportingSection`, cohérent avec le fait que les 4
 * sources HTTP tapent la même ressource (`variables`).
 */
export abstract class ReportingRepository {
    abstract execute(
        section: ReportingSection,
        options?: FetchOptions
    ): Observable<GrafanaDashboardEntity>;
}
