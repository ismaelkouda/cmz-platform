export interface RegionCreateApiDto {
    code: string;
    name: string;
    description?: string;
    population_size: number;
    infrastructure_size: number;
}
