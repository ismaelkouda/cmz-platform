import { Status } from '../enums/status.enum';

export interface DepartmentProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    region: { id: string; name: string };
    populationSize: number;
    infrastructureCount: number;
    municipalitiesCount: number;
    status: Status;
    createdAt: string;
    updatedAt: string;
}
