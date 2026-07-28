import { Platform, TypeMedia } from '@cmz/shared-domain';
import { SlideStatus } from '../enums/slide-status.enum';
import { SlideFindOneProps } from '../props/slide-find-one.props';

export class SlideFindOneEntity {
    constructor(private readonly props: SlideFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get status(): SlideStatus {
        return this.props.status;
    }

    get order(): number {
        return this.props.order;
    }

    get timeDuration(): number {
        return this.props.timeDuration;
    }

    get type(): TypeMedia {
        return this.props.type;
    }

    get image(): string {
        return this.props.image;
    }

    get video(): string {
        return this.props.video;
    }

    get platforms(): Platform[] {
        return this.props.platforms;
    }

    get startDate(): Date {
        return this.props.startDate;
    }

    get endDate(): Date {
        return this.props.endDate;
    }

    get title(): string {
        return this.props.title;
    }

    get subtitle(): string {
        return this.props.subtitle;
    }

    get content(): string {
        return this.props.content;
    }

    get buttonLabel(): string {
        return this.props.buttonLabel;
    }

    get buttonUrl(): string {
        return this.props.buttonUrl;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: SlideFindOneProps): SlideFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new SlideFindOneEntity(props);
    }
}
