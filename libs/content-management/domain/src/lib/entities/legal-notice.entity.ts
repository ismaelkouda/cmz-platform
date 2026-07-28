import { LegalNoticeStatus } from '../enums/legal-notice-status.enum';
import { LegalNoticeProps } from '../props/legal-notice.props';

export class LegalNoticeEntity {
    constructor(private readonly props: LegalNoticeProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get version(): string {
        return this.props.version;
    }

    get status(): LegalNoticeStatus {
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

    with(props: LegalNoticeProps): LegalNoticeEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new LegalNoticeEntity(props);
    }
}
