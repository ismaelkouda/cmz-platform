import { Platform } from '@cmz/shared-domain';
import { HomeStatus } from '../enums/home-status.enum';
import { HomeProps } from '../props/home.props';

export class HomeEntity {
    constructor(private readonly props: HomeProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get title(): string {
        return this.props.title;
    }

    get resume(): string {
        return this.props.resume;
    }

    get image(): string {
        return this.props.image;
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

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(props: HomeProps): HomeEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new HomeEntity(props);
    }
}
