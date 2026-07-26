export interface DepartmentCreateApiDto {
    code: string;
    name: string;
    description?: string;
    population_size: number;
    infrastructure_size: number;
    region_id: string;
}
