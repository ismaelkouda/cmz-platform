export interface InfrastructureCreateApiDto {
    name: string;
    infrastructure_type: string;
    description: string;
    region_id: string;
    department_id: string;
    municipality_id: string;
    latitude: number;
    longitude: number;
}
