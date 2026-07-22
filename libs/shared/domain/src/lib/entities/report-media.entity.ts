import { ReportMediaProps } from '../props/report-media.props';

export class ReportMediaEntity implements ReportMediaProps {
    constructor(
        public readonly placePhoto: string | null,
        public readonly accessPlacePhoto: string | null
    ) {}
}
