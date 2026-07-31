import { PaginatedResponseDto } from '@cmz/shared-data';

/** Wire — statut export (`ApiStatus` legacy). */
export type DownloadReportStatesStatusApiDto =
    'pending' | 'processing' | 'done' | 'failed';

/** Wire — format export (`DownloadTypeDto` legacy). */
export type DownloadReportStatesTypeApiDto = 'shapefile' | 'excel';

/** Wire — item liste volet « Téléchargements » (`DownloadItemApiDto` legacy). */
export interface DownloadReportStatesItemApiDto {
    id: string;
    download_url: string;
    file_name: string;
    file_size: number;
    format: DownloadReportStatesTypeApiDto;
    status: DownloadReportStatesStatusApiDto;
    filters: { key_label: string; value_label: string }[];
    created_at: string;
}

export type DownloadReportStatesResponseDto =
    PaginatedResponseDto<DownloadReportStatesItemApiDto>;
