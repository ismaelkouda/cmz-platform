import { Coordinates } from '../interfaces/coordinates.interface';

export class CoordinatesEntity implements Coordinates {
    constructor(
        public readonly latitude: number,
        public readonly longitude: number,
        public readonly what3words: string
    ) {}
}
