export class TreeNodeEntity {
    constructor(
        public readonly value: string,
        public readonly key: string,
        public readonly label: string,
        public readonly checked: boolean,
        public readonly icon: string,
        public readonly children: TreeNodeEntity[]
    ) {}
}
