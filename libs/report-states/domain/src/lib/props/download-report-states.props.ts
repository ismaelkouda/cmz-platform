import { DownloadReportStatesStatus } from '../enums/download-report-states-status.enum';
import { DownloadReportStatesType } from '../enums/download-report-states-type.enum';

export interface DownloadReportStatesFilterEntry {
    readonly name: string;
    readonly value: string;
}

/** Forme métier d'un export — volet « Téléchargements » (`DownloadEntity` legacy). */
export interface DownloadReportStatesProps {
    readonly uniqId: string;
    readonly url: string;
    readonly name: string;
    readonly size: number;
    readonly type: DownloadReportStatesType;
    readonly status: DownloadReportStatesStatus;
    readonly filters: DownloadReportStatesFilterEntry[];
    readonly createdAt: string;
}
