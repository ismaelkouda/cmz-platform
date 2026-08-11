import { ActorEntity, TreaterInfoEntity } from '@cmz/shared-domain';
import {
    WorkflowDetailsPermissions,
    WorkflowDetailsProps,
} from '../props/workflow-details.props';
import { WorkflowDetailsWorkflowTimestamp } from '../interfaces/workflow-details-workflow-timestamp.interface';
import { workflowDetailsWorkflowTimestamps } from '../utils/workflow-details-workflow-timestamps.util';
import {
    workflowDetailsPermissionsQualify,
    workflowDetailsPermissionsReject,
    workflowDetailsPermissionsTake,
} from '../utils/workflow-details-permissions.util';
import {
    workflowDetailsSubmitLabel,
    workflowDetailsTitle,
} from '../utils/workflow-details-label.util';

/** Entité fiche demande — volet `details` (legacy `DetailsEntity`). */
export class WorkflowDetailsEntity {
    constructor(
        private readonly props: WorkflowDetailsProps,
        private readonly permissions: WorkflowDetailsPermissions = {
            canTake: false,
            canQualify: false,
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

    get source(): WorkflowDetailsProps['source'] {
        return this.props.source;
    }

    get location(): WorkflowDetailsProps['location'] {
        return this.props.location;
    }

    get reportType(): WorkflowDetailsProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): WorkflowDetailsProps['operators'] {
        return this.props.operators;
    }

    get description(): string {
        return this.props.description;
    }

    get reportedAt(): string {
        return this.props.reportedAt;
    }

    get status(): WorkflowDetailsProps['status'] {
        return this.props.status;
    }

    get qualificationState(): WorkflowDetailsProps['qualificationState'] {
        return this.props.qualificationState;
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

    get media(): WorkflowDetailsProps['media'] {
        return this.props.media;
    }

    get region(): WorkflowDetailsProps['region'] {
        return this.props.region;
    }

    get department(): WorkflowDetailsProps['department'] {
        return this.props.department;
    }

    get municipality(): WorkflowDetailsProps['municipality'] {
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

    get updateWorkflowTimestamps(): WorkflowDetailsWorkflowTimestamp[] {
        return workflowDetailsWorkflowTimestamps(this.props);
    }

    get canTake(): boolean {
        return workflowDetailsPermissionsTake(
            this.props,
            this.permissions.canTake
        );
    }

    get canQualify(): boolean {
        return workflowDetailsPermissionsQualify(
            this.props,
            this.permissions.canQualify
        );
    }

    get canReject(): boolean {
        return workflowDetailsPermissionsReject(
            this.props,
            this.permissions.canQualify
        );
    }

    get titleKey(): string {
        return workflowDetailsTitle({
            props: this.props,
            permissions: this.permissions,
        });
    }

    get submitLabelKey(): string {
        return workflowDetailsSubmitLabel({
            props: this.props,
            permissions: this.permissions,
        });
    }

    withPermissions(
        permissions: WorkflowDetailsPermissions
    ): WorkflowDetailsEntity {
        if (
            permissions.canTake === this.permissions.canTake &&
            permissions.canQualify === this.permissions.canQualify
        ) {
            return this;
        }
        return new WorkflowDetailsEntity(this.props, permissions);
    }

    with(props: WorkflowDetailsProps): WorkflowDetailsEntity {
        if (
            this.props.updatedAt === props.updatedAt &&
            this.props.uniqId === props.uniqId
        ) {
            return this;
        }
        return new WorkflowDetailsEntity(props, this.permissions);
    }
}
