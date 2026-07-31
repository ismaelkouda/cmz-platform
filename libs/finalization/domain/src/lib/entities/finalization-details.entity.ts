import { ActorEntity, TreaterInfoEntity } from '@cmz/shared-domain';
import {
    FinalizationDetailsPermissions,
    FinalizationDetailsProps,
} from '../props/finalization-details.props';
import { FinalizationDetailsWorkflowTimestamp } from '../interfaces/finalization-details-workflow-timestamp.interface';
import { finalizationDetailsWorkflowTimestamps } from '../utils/finalization-details-workflow-timestamps.util';
import {
    finalizationDetailsPermissionsFinalize,
    finalizationDetailsPermissionsTake,
} from '../utils/finalization-details-permissions.util';
import {
    finalizationDetailsSubmitLabel,
    finalizationDetailsTitle,
} from '../utils/finalization-details-label.util';

/** Entité fiche demande — volet `details` (legacy `DetailsEntity`). */
export class FinalizationDetailsEntity {
    constructor(
        private readonly props: FinalizationDetailsProps,
        private readonly permissions: FinalizationDetailsPermissions = {
            canTake: false,
            canFinalize: false,
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

    get source(): FinalizationDetailsProps['source'] {
        return this.props.source;
    }

    get location(): FinalizationDetailsProps['location'] {
        return this.props.location;
    }

    get reportType(): FinalizationDetailsProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): FinalizationDetailsProps['operators'] {
        return this.props.operators;
    }

    get description(): string {
        return this.props.description;
    }

    get reportedAt(): string {
        return this.props.reportedAt;
    }

    get status(): FinalizationDetailsProps['status'] {
        return this.props.status;
    }

    get finalizationState(): FinalizationDetailsProps['finalizationState'] {
        return this.props.finalizationState;
    }

    get placeDescription(): string {
        return this.props.placeDescription;
    }

    get placePhoto(): string {
        return this.props.placePhoto;
    }

    get accessPlacePhoto(): string {
        return this.props.accessPlacePhoto;
    }

    get media(): FinalizationDetailsProps['media'] {
        return this.props.media;
    }

    get region(): FinalizationDetailsProps['region'] {
        return this.props.region;
    }

    get department(): FinalizationDetailsProps['department'] {
        return this.props.department;
    }

    get municipality(): FinalizationDetailsProps['municipality'] {
        return this.props.municipality;
    }

    get initiator(): ActorEntity | null {
        return this.props.initiator;
    }

    get approvedBy(): ActorEntity | null {
        return this.props.approvedBy;
    }

    get rejectedBy(): ActorEntity | null {
        return this.props.rejectedBy;
    }

    get processedBy(): ActorEntity | null {
        return this.props.processedBy;
    }

    get finalizedBy(): ActorEntity | null {
        return this.props.finalizedBy;
    }

    get treater(): TreaterInfoEntity {
        return this.props.treater;
    }

    get confirmCount(): number {
        return this.props.confirmCount;
    }

    get updateWorkflowTimestamps(): FinalizationDetailsWorkflowTimestamp[] {
        return finalizationDetailsWorkflowTimestamps(this.props);
    }

    get canTake(): boolean {
        return finalizationDetailsPermissionsTake(
            this.props,
            this.permissions.canTake
        );
    }

    get canFinalize(): boolean {
        return finalizationDetailsPermissionsFinalize(
            this.props,
            this.permissions.canFinalize
        );
    }

    get titleKey(): string {
        return finalizationDetailsTitle({
            props: this.props,
            permissions: this.permissions,
        });
    }

    get submitLabelKey(): string {
        return finalizationDetailsSubmitLabel({
            props: this.props,
            permissions: this.permissions,
        });
    }

    withPermissions(
        permissions: FinalizationDetailsPermissions
    ): FinalizationDetailsEntity {
        if (
            permissions.canTake === this.permissions.canTake &&
            permissions.canFinalize === this.permissions.canFinalize
        ) {
            return this;
        }
        return new FinalizationDetailsEntity(this.props, permissions);
    }

    with(props: FinalizationDetailsProps): FinalizationDetailsEntity {
        if (
            this.props.updatedAt === props.updatedAt &&
            this.props.uniqId === props.uniqId
        ) {
            return this;
        }
        return new FinalizationDetailsEntity(props, this.permissions);
    }
}
