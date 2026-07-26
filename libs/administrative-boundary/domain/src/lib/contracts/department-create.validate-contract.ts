export interface DepartmentCreateValidateContract {
    code: string;
    name: string;
    description?: string;
    populationSize: number;
    infrastructureCount: number;
    regionId: string;
}
