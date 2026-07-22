interface ReportMedia {
    readonly placePhoto: string | null;
    readonly accessPlacePhoto: string | null;
}

export class ReportMediaEntity implements ReportMedia {
    constructor(
        public readonly placePhoto: string | null,
        public readonly accessPlacePhoto: string | null
    ) {}
}
