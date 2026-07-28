import { Service } from '@angular/core';
import { NewsCategoryOption } from '@cmz/content-management-domain';
import { SimpleResponseMapper } from '@cmz/shared-data';
import {
    NewsCategorySelectItemApiDto,
    NewsSubCategorySelectItemApiDto,
} from '../dtos/news-categories-select-response-api.dto';

/**
 * `value` = cast string classique de l'id numérique (`String(id)`), pas le
 * `JSON.stringify(id)` fragile du source (comportement identique pour un
 * nombre, mais plus lisible/intentionnel).
 */
@Service()
export class NewsCategoriesSelectMapper extends SimpleResponseMapper<
    NewsCategoryOption[],
    NewsCategorySelectItemApiDto[]
> {
    protected mapItemFromDto(
        dtos: NewsCategorySelectItemApiDto[]
    ): NewsCategoryOption[] {
        return (dtos ?? []).map((dto) => ({
            value: String(dto.id),
            label: dto.name,
            subCategories: (dto.sub_categories ?? []).map(
                (sub: NewsSubCategorySelectItemApiDto) => ({
                    value: String(sub.id),
                    label: sub.name,
                })
            ),
        }));
    }
}
