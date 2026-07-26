import { MunicipalityOption } from './municipality-option.interface';

/** Option de select "département" — porte le cascade vers ses communes. */
export interface DepartmentOption {
    readonly id: string;
    readonly name: string;
    readonly code: string;
    readonly municipalities: readonly MunicipalityOption[];
}
