/**
 * Option de select "commune" — feuille du cascade region → department →
 * municipality. Valeur pure, aucune classe (même esprit que `SelectOption` du
 * kernel, étendu pour porter `code`).
 */
export interface MunicipalityOption {
    readonly id: string;
    readonly name: string;
    readonly code: string;
}
