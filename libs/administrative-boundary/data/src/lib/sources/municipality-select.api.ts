import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ADMINISTRATIVE_BOUNDARY_ENDPOINTS } from '../endpoints/administrative-boundary.endpoints';
import { MunicipalitySelectResponseApiDto } from '../dtos/municipality-select-response-api.dto';

/**
 * Contrairement à `DepartmentSelectApi`/`RegionSelectApi` (`/selected-field`),
 * ce endpoint pointe sur la liste standard
 * (`territorial-structures/municipalities`, sans suffixe) — vérifié avant
 * d'écrire ce fichier : `tools/mock-server/domains/administrative-boundary.mjs`
 * n'a AUCUNE route `municipalities/selected-field` (seules `regions/` et
 * `departments/` l'ont), municipality étant la feuille du cascade, jamais
 * sélectionnée de façon autonome côté source. Reproduire `/selected-field`
 * ici aurait pointé vers une route inexistante.
 */
@Service()
export class MunicipalitySelectApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    readAll(
        options?: FetchOptions
    ): Observable<MunicipalitySelectResponseApiDto> {
        const url = `${this.baseUrl}${ADMINISTRATIVE_BOUNDARY_ENDPOINTS.MUNICIPALITY}`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<MunicipalitySelectResponseApiDto>(url, {
            context,
        });
    }
}
