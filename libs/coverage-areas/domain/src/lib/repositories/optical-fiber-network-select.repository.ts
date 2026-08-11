import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * T11-7 (2026-08-11) — construite sur le même gabarit que
 * `SiteGroupSelectRepository` (même module, seul autre `select` à champ
 * `name` plat — `MobileNetworkSelectRepository` utilise `site_name`, pas
 * transposable ici). Port présent mais sans consommateur pour l'instant,
 * comme `SiteGroupSelectRepository` l'était déjà avant `optical-fiber-
 * network` (cf. son propre docstring) — le champ wire `name` est confirmé
 * réel (`OpticalFiberNetworkItemApiDto.name`,
 * data/src/lib/dtos/optical-fiber-network-response-api.dto.ts), pas deviné.
 */
export abstract class OpticalFiberNetworkSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
