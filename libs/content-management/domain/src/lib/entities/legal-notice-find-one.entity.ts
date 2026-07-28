import { LegalNoticeStatus } from '../enums/legal-notice-status.enum';
import { LegalNoticeFindOneProps } from '../props/legal-notice-find-one.props';

export class LegalNoticeFindOneEntity {
    constructor(private readonly props: LegalNoticeFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get version(): string {
        return this.props.version;
    }

    get status(): LegalNoticeStatus {
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

    with(props: LegalNoticeFindOneProps): LegalNoticeFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new LegalNoticeFindOneEntity(props);
    }
}
