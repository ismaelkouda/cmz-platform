import {
    ActorEntity,
    AdministrativeBoundaryEntity,
    ReportLocationEntity,
    ReportMediaEntity,
    ReportSource,
    ReportType,
    TelecomOperator,
    TimestampsEntity,
    TreaterInfoEntity,
    TypeReport,
} from '@cmz/shared-domain';
import { WorkflowDetailsQualificationState } from '../enums/workflow-details-qualification-state.enum';
import { WorkflowDetailsStatus } from '../enums/workflow-details-status.enum';

/** Forme métier fiche demande — volet `details` (legacy `DetailsProps`). */
export interface WorkflowDetailsProps {
    readonly type: TypeReport;
    readonly uniqId: string;
    readonly reportUniqId: string;
    readonly initiatorPhone: string;
    readonly initiator: ActorEntity | null;
    readonly acknowledgedBy: ActorEntity | null;
    readonly processedBy: ActorEntity | null;
    readonly finalizedBy: ActorEntity | null;
    readonly approvedBy: ActorEntity | null;
    readonly rejectedBy: ActorEntity | null;
    readonly confirmedBy: ActorEntity | null;
    readonly abandonedBy: ActorEntity | null;
    readonly source: ReportSource;
    readonly location: ReportLocationEntity;
    readonly reportType: ReportType;
    readonly operators: TelecomOperator[];
    readonly description: string;
    readonly media: ReportMediaEntity | null;
    readonly treater: TreaterInfoEntity;
    readonly status: WorkflowDetailsStatus;
    readonly qualificationState: WorkflowDetailsQualificationState | null;
    readonly region: AdministrativeBoundaryEntity | null;
    readonly department: AdministrativeBoundaryEntity | null;
    readonly municipality: AdministrativeBoundaryEntity | null;
    readonly timestamps: TimestampsEntity;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly reportedAt: string;
    readonly placePhoto: string;
    readonly accessPlacePhoto: string;
    readonly confirmCount: number;
    readonly placeDescription: string;
}

export interface WorkflowDetailsPermissions {
    readonly canTake: boolean;
    readonly canQualify: boolean;
}

export interface WorkflowDetailsContext {
    readonly props: WorkflowDetailsProps;
    readonly permissions: WorkflowDetailsPermissions;
}
