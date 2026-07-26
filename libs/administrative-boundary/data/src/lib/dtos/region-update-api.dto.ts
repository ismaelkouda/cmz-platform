export interface RegionUpdateApiDto {
    id: string;
    code: string;
    name: string;
    description?: string;
    population_size: number;
    infrastructure_size: number;
}
