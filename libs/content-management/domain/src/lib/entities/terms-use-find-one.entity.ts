import { TermsUseStatus } from '../enums/terms-use-status.enum';
import { TermsUseFindOneProps } from '../props/terms-use-find-one.props';

export class TermsUseFindOneEntity {
    constructor(private readonly props: TermsUseFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get version(): string {
        return this.props.version;
    }

    get status(): TermsUseStatus {
        return this.props.status;
    }

    get content(): string {
        return this.props.content;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: TermsUseFindOneProps): TermsUseFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new TermsUseFindOneEntity(props);
    }
}
