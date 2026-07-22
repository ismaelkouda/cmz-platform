interface Actor {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly phone: string;
    readonly email: string;
}

export class ActorEntity implements Actor {
    constructor(
        public readonly id: string,
        public readonly firstName: string,
        public readonly lastName: string,
        public readonly phone: string,
        public readonly email: string
    ) {}
}
