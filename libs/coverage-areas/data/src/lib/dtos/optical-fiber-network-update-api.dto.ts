export interface OpticalFiberNetworkUpdateApiDto {
    id: string;
    name: string;
    operator: string;
    fiber_constructor_id: string | number;
    type: string;
    geom_file?: File;
}
