import { PrivacyPolicyStatus } from '../enums/privacy-policy-status.enum';
import { PrivacyPolicyProps } from '../props/privacy-policy.props';

export class PrivacyPolicyEntity {
    constructor(private readonly props: PrivacyPolicyProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get version(): string {
        return this.props.version;
    }

    get status(): PrivacyPolicyStatus {
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

    with(props: PrivacyPolicyProps): PrivacyPolicyEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new PrivacyPolicyEntity(props);
    }
}
