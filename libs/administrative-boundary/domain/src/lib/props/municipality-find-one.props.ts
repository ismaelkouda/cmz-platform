import { Status } from '../enums/status.enum';

/**
 * Source utilisait `infrastructureSize` ici (vs `infrastructureCount` en
 * liste) → unifié en `infrastructureCount` (même incohérence déjà corrigée
 * pour `region`, cf. décision module).
 */
export interface MunicipalityFindOneProps {
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
