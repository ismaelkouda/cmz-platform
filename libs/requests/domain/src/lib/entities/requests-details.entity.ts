import { ActorEntity, TreaterInfoEntity } from '@cmz/shared-domain';
import {
    RequestsDetailsPermissions,
    RequestsDetailsProps,
} from '../props/requests-details.props';
import { RequestsDetailsWorkflowTimestamp } from '../interfaces/requests-details-workflow-timestamp.interface';
import { requestsDetailsWorkflowTimestamps } from '../utils/requests-details-workflow-timestamps.util';
import {
    requestsDetailsPermissionsQualify,
    requestsDetailsPermissionsReject,
    requestsDetailsPermissionsTake,
} from '../utils/requests-details-permissions.util';
import {
    requestsDetailsSubmitLabel,
    requestsDetailsTitle,
} from '../utils/requests-details-label.util';

/** Entité fiche demande — volet `details` (legacy `DetailsEntity`). */
export class RequestsDetailsEntity {
    constructor(
        private readonly props: RequestsDetailsProps,
        private readonly permissions: RequestsDetailsPermissions = {
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

    get source(): RequestsDetailsProps['source'] {
        return this.props.source;
    }

    get location(): RequestsDetailsProps['location'] {
        return this.props.location;
    }

    get reportType(): RequestsDetailsProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): RequestsDetailsProps['operators'] {
        return this.props.operators;
    }

    get description(): string {
        return this.props.description;
    }

    get reportedAt(): string {
        return this.props.reportedAt;
    }

    get status(): RequestsDetailsProps['status'] {
        return this.props.status;
    }

    get qualificationState(): RequestsDetailsProps['qualificationState'] {
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

    get media(): RequestsDetailsProps['media'] {
        return this.props.media;
    }

    get region(): RequestsDetailsProps['region'] {
        return this.props.region;
    }

    get department(): RequestsDetailsProps['department'] {
        return this.props.department;
    }

    get municipality(): RequestsDetailsProps['municipality'] {
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

    get updateWorkflowTimestamps(): RequestsDetailsWorkflowTimestamp[] {
        return requestsDetailsWorkflowTimestamps(this.props);
    }

    get canTake(): boolean {
        return requestsDetailsPermissionsTake(
            this.props,
            this.permissions.canTake
        );
    }

    get canQualify(): boolean {
        return requestsDetailsPermissionsQualify(
            this.props,
            this.permissions.canQualify
        );
    }

    get canReject(): boolean {
        return requestsDetailsPermissionsReject(
            this.props,
            this.permissions.canQualify
        );
    }

    get titleKey(): string {
        return requestsDetailsTitle({
            props: this.props,
            permissions: this.permissions,
        });
    }

    get submitLabelKey(): string {
        return requestsDetailsSubmitLabel({
            props: this.props,
            permissions: this.permissions,
        });
    }

    withPermissions(
        permissions: RequestsDetailsPermissions
    ): RequestsDetailsEntity {
        if (
            permissions.canTake === this.permissions.canTake &&
            permissions.canQualify === this.permissions.canQualify
        ) {
            return this;
        }
        return new RequestsDetailsEntity(this.props, permissions);
    }

    with(props: RequestsDetailsProps): RequestsDetailsEntity {
        if (
            this.props.updatedAt === props.updatedAt &&
            this.props.uniqId === props.uniqId
        ) {
            return this;
        }
        return new RequestsDetailsEntity(props, this.permissions);
    }
}
