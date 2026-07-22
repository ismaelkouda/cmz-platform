export class ResourcesUpdateCommand {
    constructor(
        public readonly uniqId: string | undefined,
        public readonly code: string | undefined,
        public readonly name: string | undefined,
        public readonly description: string | undefined
    ) {}
}
