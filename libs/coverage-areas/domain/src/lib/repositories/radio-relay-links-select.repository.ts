import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * T11-7 (2026-08-11) — même gabarit que `OpticalFiberNetworkSelectRepository`
 * (même module, même constat) : champ wire `name` confirmé réel
 * (`RadioRelayLinksItemApiDto.name`,
 * data/src/lib/dtos/radio-relay-links-response-api.dto.ts), pas deviné. Port
 * présent mais sans consommateur pour l'instant, comme `SiteGroupSelect
 * Repository`/`OpticalFiberNetworkSelectRepository` avant lui.
 */
export abstract class RadioRelayLinksSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
