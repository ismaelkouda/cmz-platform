export interface DepartmentUpdateApiDto {
    id: string;
    code: string;
    name: string;
    description?: string;
    population_size: number;
    infrastructure_size: number;
    region_id: string;
}
