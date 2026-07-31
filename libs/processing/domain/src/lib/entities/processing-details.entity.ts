import {
    ProcessingDetailsPermissions,
    ProcessingDetailsProps,
} from '../props/processing-details.props';
import { processingDetailsPermissionsTake } from '../utils/processing-details-permissions.util';
import { processingDetailsPermissionsTreat } from '../utils/processing-details-permissions.util';
import {
    processingDetailsSubmitLabel,
    processingDetailsTitle,
} from '../utils/processing-details-label.util';

/** Entité fiche signalement — volet `details` (legacy `DetailsEntity`). */
export class ProcessingDetailsEntity {
    constructor(
        private readonly props: ProcessingDetailsProps,
        private readonly permissions: ProcessingDetailsPermissions = {
            canTake: false,
            canTreat: false,
        }
    ) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportUniqId(): string {
        return this.props.reportUniqId;
    }

    get initiatorPhone(): string {
        return this.props.initiatorPhone;
    }

    get source(): ProcessingDetailsProps['source'] {
        return this.props.source;
    }

    get reportType(): ProcessingDetailsProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): ProcessingDetailsProps['operators'] {
        return this.props.operators;
    }

    get description(): string {
        return this.props.description;
    }

    get reportedAt(): string {
        return this.props.reportedAt;
    }

    get processingState(): ProcessingDetailsProps['processingState'] {
        return this.props.processingState;
    }

    get state(): ProcessingDetailsProps['state'] {
        return this.props.state;
    }

    get canTake(): boolean {
        return processingDetailsPermissionsTake(
            this.props,
            this.permissions.canTake
        );
    }

    get canTreat(): boolean {
        return processingDetailsPermissionsTreat(
            this.props,
            this.permissions.canTreat
        );
    }

    get titleKey(): string {
        return processingDetailsTitle({
            props: this.props,
            permissions: this.permissions,
        });
    }

    get submitLabelKey(): string {
        return processingDetailsSubmitLabel({
            props: this.props,
            permissions: this.permissions,
        });
    }

    withPermissions(
        permissions: ProcessingDetailsPermissions
    ): ProcessingDetailsEntity {
        if (
            permissions.canTake === this.permissions.canTake &&
            permissions.canTreat === this.permissions.canTreat
        ) {
            return this;
        }
        return new ProcessingDetailsEntity(this.props, permissions);
    }

    with(props: ProcessingDetailsProps): ProcessingDetailsEntity {
        if (
            this.props.updatedAt === props.updatedAt &&
            this.props.uniqId === props.uniqId
        ) {
            return this;
        }
        return new ProcessingDetailsEntity(props, this.permissions);
    }
}
