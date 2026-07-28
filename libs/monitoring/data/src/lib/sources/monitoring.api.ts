import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { SETTINGS_API_URL, BYPASS_CACHE } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { MONITORING_ENDPOINTS } from '../endpoints/monitoring.endpoints';
import { MonitoringVariablesResponseDto } from '../dtos/monitoring-variables-response.dto';

/**
 * Les 4 sources HTTP du source (`NodeApi`/`ServicesApi`/`ResourcesApi`/
 * `JobsApi`) appelaient chacune, indépendamment, `GET
 * {SETTINGS_API_URL}variables` — même verbe, même URL, même base
 * (`SETTINGS_API_URL`, pas `REPORT_API_URL` : cette ressource est bien un
 * concept "settings/config système", pas un concept "report"). Une seule
 * classe suffit ; c'est la section (cf. `GrafanaDashboardMapper`) qui
 * choisit quel champ de la réponse est pertinent, pas l'URL appelée.
 */
@Service()
export class MonitoringApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(SETTINGS_API_URL);

    getVariables(
        options?: FetchOptions
    ): Observable<MonitoringVariablesResponseDto> {
        const url = `${this.baseUrl}${MONITORING_ENDPOINTS.VARIABLES}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MonitoringVariablesResponseDto>(url, {
            context,
        });
    }
}
