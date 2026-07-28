import { TypeMedia } from '@cmz/shared-domain';
import { NewsStatus } from '../enums/news-status.enum';
import { NewsProps } from '../props/news.props';

export class NewsEntity {
    constructor(private readonly props: NewsProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get type(): TypeMedia {
        return this.props.type;
    }

    get title(): string {
        return this.props.title;
    }

    get category(): string {
        return this.props.category;
    }

    get subCategory(): string {
        return this.props.subCategory;
    }

    get status(): NewsStatus {
        return this.props.status;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: NewsProps): NewsEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new NewsEntity(props);
    }
}
