import { Status } from '../enums/status.enum';

/**
 * `region`/`department` gardés en objets `{id, name}` (jamais aplatis en
 * string) — même convention que `department.props.ts` (préserve l'id pour le
 * préremplissage des selects en édition). Champ source `region`/`department`
 * (string) corrigé en conséquence.
 */
export interface MunicipalityProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    region: { id: string; name: string };
    department: { id: string; name: string };
    populationSize: number;
    infrastructureCount: number;
    status: Status;
    createdAt: string;
    updatedAt: string;
}
