import { Status } from '../enums/status.enum';

/**
 * Shape confirmée côté source pour la vue imbriquée : pas de champ `region`
 * (implicite — scope déjà porté par le filtre parent `regionId`).
 */
export interface DepartmentsByRegionIdProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    populationSize: number;
    municipalitiesCount: number;
    status: Status;
    createdAt: string;
    updatedAt: string;
}
