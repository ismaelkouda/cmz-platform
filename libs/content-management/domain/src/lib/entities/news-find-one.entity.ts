import { TypeMedia } from '@cmz/shared-domain';
import { NewsStatus } from '../enums/news-status.enum';
import { NewsFindOneProps } from '../props/news-find-one.props';

export class NewsFindOneEntity {
    constructor(private readonly props: NewsFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get status(): NewsStatus {
        return this.props.status;
    }

    get order(): number {
        return this.props.order;
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

    get category(): string {
        return this.props.category;
    }

    get subCategory(): string {
        return this.props.subCategory;
    }

    get hashtags(): string[] {
        return this.props.hashtags;
    }

    get title(): string {
        return this.props.title;
    }

    get resume(): string {
        return this.props.resume;
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

    with(props: NewsFindOneProps): NewsFindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new NewsFindOneEntity(props);
    }
}
