import { Status } from '../enums/status.enum';

export interface RegionFindOneProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    populationSize: number;
    infrastructureCount: number;
    departmentsCount: number;
    municipalitiesCount: number;
    status: Status;
    createdAt: string;
    updatedAt: string;
}
