import { AdministrativeBoundary } from '../interfaces/administrative-boundary.interface';

export class AdministrativeBoundaryEntity implements AdministrativeBoundary {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly code: string
    ) {}
}
