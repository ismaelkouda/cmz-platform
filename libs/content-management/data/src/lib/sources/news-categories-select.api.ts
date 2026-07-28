import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { BYPASS_CACHE, SETTINGS_API_URL } from '@cmz/core';
import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { CONTENT_MANAGEMENT_ENDPOINTS } from '../endpoints/content-management.endpoints';
import { NewsCategoriesSelectResponseApiDto } from '../dtos/news-categories-select-response-api.dto';

@Service()
export class NewsCategoriesSelectApi {
    private readonly http = inject(HttpClient);
    private readonly baseUrl: string = inject(SETTINGS_API_URL);

    execute(
        options?: FetchOptions
    ): Observable<NewsCategoriesSelectResponseApiDto> {
        const url = `${this.baseUrl}${CONTENT_MANAGEMENT_ENDPOINTS.NEWS_CATEGORIES}/selected-field`;
        const context = new HttpContext().set(
            BYPASS_CACHE,
            options?.forceRefresh ?? false
        );
        return this.http.get<NewsCategoriesSelectResponseApiDto>(url, {
            context,
        });
    }
}
