import { TermsUseStatus } from '../enums/terms-use-status.enum';
import { TermsUseProps } from '../props/terms-use.props';

export class TermsUseEntity {
    constructor(private readonly props: TermsUseProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get version(): string {
        return this.props.version;
    }

    get status(): TermsUseStatus {
        return this.props.status;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get publishedAt(): string {
        return this.props.publishedAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: TermsUseProps): TermsUseEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new TermsUseEntity(props);
    }
}
