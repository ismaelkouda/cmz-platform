export interface InteractiveMapReportEntity {
    uniqId: string;
    reportType: string;
    operator: string;
    state: string;
    latitude: number;
    longitude: number;
    regionName?: string;
    departmentName?: string;
    municipalityName?: string;
    reportedAt?: string;
}
