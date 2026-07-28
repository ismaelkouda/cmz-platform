export interface TeamsUpdateApiDto {
    id: string;
    name: string;
    description: string;
    operators: string[];
    report_types: string[];
    permissions?: number[];
}
