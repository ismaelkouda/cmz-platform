interface AdministrativeBoundary {
    readonly id: string;
    readonly name: string;
    readonly code: string;
}

export class AdministrativeBoundaryEntity implements AdministrativeBoundary {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly code: string
    ) {}
}
