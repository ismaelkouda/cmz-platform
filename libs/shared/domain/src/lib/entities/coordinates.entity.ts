import { CoordinatesProps } from '../props/coordinates.props';

export class CoordinatesEntity implements CoordinatesProps {
    constructor(
        public readonly latitude: number,
        public readonly longitude: number,
        public readonly what3words: string
    ) {}
}
