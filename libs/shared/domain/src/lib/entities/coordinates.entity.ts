interface Coordinates {
    latitude: number;
    longitude: number;
    what3words: string;
}

export class CoordinatesEntity implements Coordinates {
    constructor(
        public readonly latitude: number,
        public readonly longitude: number,
        public readonly what3words: string
    ) {}
}
