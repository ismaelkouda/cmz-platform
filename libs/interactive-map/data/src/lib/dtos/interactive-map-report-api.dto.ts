/** Wire item — GET `report/all` (legacy `InteractiveMapReport`). */
export interface InteractiveMapReportApiDto {
    uniq_id: string | number;
    lat: number | string;
    long: number | string;
    report_type: string;
    operators: string | string[];
    state: string;
    is_duplicated?: boolean;
    region?: { name?: string } | string | null;
    department?: { name?: string } | string | null;
    municipality?: { name?: string } | string | null;
    reported_at?: string | null;
}

export interface InteractiveMapReportsResponseApiDto {
    data: {
        data: InteractiveMapReportApiDto[];
    };
}
