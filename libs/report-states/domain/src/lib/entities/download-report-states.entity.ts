import {
    DownloadReportStatesStatus,
    downloadReportStatesStatusStyle,
} from '../enums/download-report-states-status.enum';
import { DownloadReportStatesType } from '../enums/download-report-states-type.enum';
import { DownloadReportStatesProps } from '../props/download-report-states.props';

/** Entité liste — volet « Téléchargements » (`DownloadEntity` legacy). */
export class DownloadReportStatesEntity {
    constructor(private readonly props: DownloadReportStatesProps) {}

    get actionsRef(): string {
        return this.props.createdAt;
    }

    get uniqId(): string {
        return this.props.uniqId;
    }

    get url(): string {
        return this.props.url;
    }

    get name(): string {
        return this.props.name;
    }

    get size(): number {
        return this.props.size;
    }

    get type(): DownloadReportStatesType {
        return this.props.type;
    }

    get status(): DownloadReportStatesStatus {
        return this.props.status;
    }

    statusStyle(status: DownloadReportStatesStatus): string {
        return downloadReportStatesStatusStyle(status);
    }

    get filters(): DownloadReportStatesProps['filters'] {
        return this.props.filters;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    with(props: DownloadReportStatesProps): DownloadReportStatesEntity {
        return new DownloadReportStatesEntity(props);
    }
}
