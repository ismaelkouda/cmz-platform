import {
    DownloadReportStatesEntity,
    DownloadReportStatesStatus,
} from '@cmz/report-states-domain';
import { DownloadReportStatesVmProps } from './download-report-states-vm-props.interface';

const T = 'REPORT_STATES.DOWNLOAD';

export class DownloadReportStatesPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: DownloadReportStatesEntity): DownloadReportStatesVmProps {
        const canDownload = item.status === DownloadReportStatesStatus.DONE;

        return {
            uniqId: item.uniqId,
            url: item.url,
            name: item.name,
            size: item.size ? `${item.size} Ko` : '--',
            typeLabel: this.t(item.type),
            status: item.status,
            statusLabel: this.t(item.status),
            statusStyle: this.t(item.statusStyle(item.status)),
            filters: item.filters,
            filtersCount: item.filters.length,
            date: item.createdAt,
            actionsRef: item.actionsRef,
            tooltipButtonDownload: canDownload
                ? this.t(`${T}.TOOLTIP.DOWNLOAD`)
                : this.t(`${T}.TOOLTIP.NO_DOWNLOAD`),
            disableButtonDownload: !canDownload,
            actionButtons: {
                download: {
                    tooltip: canDownload
                        ? this.t(`${T}.TOOLTIP.DOWNLOAD`)
                        : this.t(`${T}.TOOLTIP.NO_DOWNLOAD`),
                    disabled: !canDownload,
                },
            },
        };
    }
}
