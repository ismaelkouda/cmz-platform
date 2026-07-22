import { ReportMedia } from '../interfaces/report-media.interface';

export class ReportMediaEntity implements ReportMedia {
    constructor(
        public readonly placePhoto: string | null,
        public readonly accessPlacePhoto: string | null
    ) {}
}
