import { SelectOption } from '@cmz/shared-domain';

/**
 * Option de sélection catégorie pour le formulaire `news`, avec ses
 * sous-catégories imbriquées (sélection en cascade catégorie → sous-catégorie).
 * Remplace `CategoryEntity`/`SubCategoryEntity` du source, qui sont du code
 * mort (aucune référence ailleurs dans tout le repo source, vérifié) — pas
 * portés ici. Remplace aussi le `value: JSON.stringify(id)` fragile du source
 * par un cast string classique (fait au mapping, Phase 3).
 */
export interface NewsCategoryOption extends SelectOption {
    subCategories: SelectOption[];
}
