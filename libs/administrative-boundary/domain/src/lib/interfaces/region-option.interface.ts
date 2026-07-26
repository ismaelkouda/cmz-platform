import { DepartmentOption } from './department-option.interface';

/**
 * Option de select "région" — racine du cascade region → department →
 * municipality. Permet aux formulaires (department, municipality) de
 * dériver leurs selects dépendants sans rappel réseau (cf. décision
 * « cascade region → departments côté select »).
 */
export interface RegionOption {
    readonly id: string;
    readonly name: string;
    readonly code: string;
    readonly departments: readonly DepartmentOption[];
}
