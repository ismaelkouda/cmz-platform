import { DownloadReportStatesStatus } from '@cmz/report-states-domain';
import { TableRowBase } from '@cmz/shared-ui';

export interface DownloadReportStatesVmProps extends TableRowBase {
    uniqId: string;
    url: string;
    name: string;
    size: string;
    typeLabel: string;
    status: DownloadReportStatesStatus;
    statusLabel: string;
    statusStyle: string;
    filters: { name: string; value: string }[];
    filtersCount: number;
    date: string;
    actionsRef: string;
    tooltipButtonDownload: string;
    disableButtonDownload: boolean;
}
