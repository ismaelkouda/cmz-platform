export interface MunicipalityCreateValidateContract {
    code: string;
    name: string;
    description?: string;
    populationSize: number;
    infrastructureCount: number;
    regionId: string;
    departmentId: string;
}
