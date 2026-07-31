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
import { FinalizationDetailsFinalizationState } from '../enums/finalization-details-finalization-state.enum';
import { FinalizationDetailsStatus } from '../enums/finalization-details-status.enum';

/** Forme métier fiche demande — volet `details` (legacy `DetailsProps`). */
export interface FinalizationDetailsProps {
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
    readonly status: FinalizationDetailsStatus;
    readonly finalizationState: FinalizationDetailsFinalizationState | null;
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

export interface FinalizationDetailsPermissions {
    readonly canTake: boolean;
    readonly canFinalize: boolean;
}

export interface FinalizationDetailsContext {
    readonly props: FinalizationDetailsProps;
    readonly permissions: FinalizationDetailsPermissions;
}
