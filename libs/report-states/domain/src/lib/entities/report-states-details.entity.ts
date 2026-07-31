import { ActorEntity, TreaterInfoEntity } from '@cmz/shared-domain';
import {
    ReportStatesDetailsPermissions,
    ReportStatesDetailsProps,
} from '../props/report-states-details.props';
import { ReportStatesDetailsWorkflowTimestamp } from '../interfaces/report-states-details-workflow-timestamp.interface';
import { reportStatesDetailsWorkflowTimestamps } from '../utils/report-states-details-workflow-timestamps.util';
import {
    reportStatesDetailsPermissionsQualify,
    reportStatesDetailsPermissionsReject,
    reportStatesDetailsPermissionsTake,
} from '../utils/report-states-details-permissions.util';
import {
    reportStatesDetailsSubmitLabel,
    reportStatesDetailsTitle,
} from '../utils/report-states-details-label.util';

/** Entité fiche demande — volet `details` (legacy `DetailsEntity`). */
export class ReportStatesDetailsEntity {
    constructor(
        private readonly props: ReportStatesDetailsProps,
        private readonly permissions: ReportStatesDetailsPermissions = {
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

    get source(): ReportStatesDetailsProps['source'] {
        return this.props.source;
    }

    get location(): ReportStatesDetailsProps['location'] {
        return this.props.location;
    }

    get reportType(): ReportStatesDetailsProps['reportType'] {
        return this.props.reportType;
    }

    get operators(): ReportStatesDetailsProps['operators'] {
        return this.props.operators;
    }

    get description(): string {
        return this.props.description;
    }

    get reportedAt(): string {
        return this.props.reportedAt;
    }

    get status(): ReportStatesDetailsProps['status'] {
        return this.props.status;
    }

    get qualificationState(): ReportStatesDetailsProps['qualificationState'] {
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

    get media(): ReportStatesDetailsProps['media'] {
        return this.props.media;
    }

    get region(): ReportStatesDetailsProps['region'] {
        return this.props.region;
    }

    get department(): ReportStatesDetailsProps['department'] {
        return this.props.department;
    }

    get municipality(): ReportStatesDetailsProps['municipality'] {
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

    get updateWorkflowTimestamps(): ReportStatesDetailsWorkflowTimestamp[] {
        return reportStatesDetailsWorkflowTimestamps(this.props);
    }

    get canTake(): boolean {
        return reportStatesDetailsPermissionsTake(
            this.props,
            this.permissions.canTake
        );
    }

    get canQualify(): boolean {
        return reportStatesDetailsPermissionsQualify(
            this.props,
            this.permissions.canQualify
        );
    }

    get canReject(): boolean {
        return reportStatesDetailsPermissionsReject(
            this.props,
            this.permissions.canQualify
        );
    }

    get titleKey(): string {
        return reportStatesDetailsTitle({
            props: this.props,
            permissions: this.permissions,
        });
    }

    get submitLabelKey(): string {
        return reportStatesDetailsSubmitLabel({
            props: this.props,
            permissions: this.permissions,
        });
    }

    withPermissions(
        permissions: ReportStatesDetailsPermissions
    ): ReportStatesDetailsEntity {
        if (
            permissions.canTake === this.permissions.canTake &&
            permissions.canQualify === this.permissions.canQualify
        ) {
            return this;
        }
        return new ReportStatesDetailsEntity(this.props, permissions);
    }

    with(props: ReportStatesDetailsProps): ReportStatesDetailsEntity {
        if (
            this.props.updatedAt === props.updatedAt &&
            this.props.uniqId === props.uniqId
        ) {
            return this;
        }
        return new ReportStatesDetailsEntity(props, this.permissions);
    }
}
