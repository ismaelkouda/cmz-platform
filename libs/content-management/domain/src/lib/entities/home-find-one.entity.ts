import { Platform } from '@cmz/shared-domain';
import { HomeStatus } from '../enums/home-status.enum';
import { HomeFindOneProps } from '../props/home-find-one.props';

export class HomeFindOneEntity {
    constructor(private readonly props: HomeFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get title(): string {
        return this.props.title;
    }

    get resume(): string {
        return this.props.resume;
    }

    get order(): number {
        return this.props.order;
    }

    get platforms(): Platform[] {
        return this.props.platforms;
    }

    get status(): HomeStatus {
        return this.props.status;
    }

    get content(): string {
        return this.props.content;
    }

    get image(): string {
        return this.props.image;
    }

    get timeDurationInSeconds(): number {
        return this.props.timeDurationInSeconds;
    }

    get buttonLabel(): string {
        return this.props.buttonLabel;
    }

    get buttonUrl(): string {
        return this.props.buttonUrl;
    }

    get startDate(): Date {
        return this.props.startDate;
    }

    get endDate(): Date {
        return this.props.endDate;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: HomeFindOneProps): HomeFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new HomeFindOneEntity(props);
    }
}
