import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * Sous-catégorie non récursive (contrairement au DTO source, qui réutilise
 * le même type auto-référencé `sub_categories: NewsCategoriesSelectItemApiDto[]`
 * pour les sous-catégories elles-mêmes — imprécis, une sous-catégorie n'a
 * pas de sous-catégories). Corrigé ici : type dédié à plat.
 */
export interface NewsSubCategorySelectItemApiDto {
    id: number;
    name: string;
}

export interface NewsCategorySelectItemApiDto {
    id: number;
    name: string;
    sub_categories: NewsSubCategorySelectItemApiDto[];
}

export type NewsCategoriesSelectResponseApiDto = SimpleResponseDto<
    NewsCategorySelectItemApiDto[]
>;
