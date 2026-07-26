export interface DepartmentUpdateValidateContract {
    uniqId: string;
    code: string;
    name: string;
    description?: string;
    populationSize: number;
    infrastructureCount: number;
    regionId: string;
}
