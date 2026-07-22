import { AdministrativeBoundaryProps } from '../props/administrative-boundary.props';

export class AdministrativeBoundaryEntity implements AdministrativeBoundaryProps {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly code: string
    ) {}
}
