import { PrivacyPolicyStatus } from '../enums/privacy-policy-status.enum';
import { PrivacyPolicyFindOneProps } from '../props/privacy-policy-find-one.props';

export class PrivacyPolicyFindOneEntity {
    constructor(private readonly props: PrivacyPolicyFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get version(): string {
        return this.props.version;
    }

    get status(): PrivacyPolicyStatus {
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

    with(props: PrivacyPolicyFindOneProps): PrivacyPolicyFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new PrivacyPolicyFindOneEntity(props);
    }
}
