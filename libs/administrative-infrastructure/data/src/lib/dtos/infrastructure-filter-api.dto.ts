export interface InfrastructureFilterApiDto {
    search?: string;
    type?: string;
    region_id: string;
    department_id: string;
    municipality_id: string;
    start_date?: Date;
    end_date?: Date;
}
