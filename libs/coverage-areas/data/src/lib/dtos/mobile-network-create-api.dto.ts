export interface MobileNetworkCreateApiDto {
    site_id: string;
    site_name: string;
    infrastructure_type: string;
    tower_type_id: string;
    tower_size: number;
    technology: string[];
    operator: string;
    radius?: number;
}
