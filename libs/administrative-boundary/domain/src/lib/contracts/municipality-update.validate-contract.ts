export interface MunicipalityUpdateValidateContract {
    uniqId: string;
    code: string;
    name: string;
    description?: string;
    populationSize: number;
    infrastructureCount: number;
    regionId: string;
    departmentId: string;
}
