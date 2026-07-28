import { Platform, TypeMedia } from '@cmz/shared-domain';
import { SlideStatus } from '../enums/slide-status.enum';
import { SlideProps } from '../props/slide.props';

export class SlideEntity {
    constructor(private readonly props: SlideProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get type(): TypeMedia {
        return this.props.type;
    }

    get title(): string {
        return this.props.title;
    }

    get subtitle(): string {
        return this.props.subtitle;
    }

    get order(): number {
        return this.props.order;
    }

    get platforms(): Platform[] {
        return this.props.platforms;
    }

    get status(): SlideStatus {
        return this.props.status;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: SlideProps): SlideEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new SlideEntity(props);
    }
}
