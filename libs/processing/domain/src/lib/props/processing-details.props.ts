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
import { ProcessingDetailsProcessingState } from '../enums/processing-details-processing-state.enum';
import { ProcessingDetailsState } from '../enums/processing-details-state.enum';
import { ProcessingDetailsStatus } from '../enums/processing-details-status.enum';

/** Forme métier fiche signalement — volet `details` (legacy `DetailsProps`). */
export interface ProcessingDetailsProps {
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
    readonly status: ProcessingDetailsStatus;
    readonly processingState: ProcessingDetailsProcessingState;
    readonly state: ProcessingDetailsState;
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

export interface ProcessingDetailsPermissions {
    readonly canTake: boolean;
    readonly canTreat: boolean;
}

export interface ProcessingDetailsContext {
    readonly props: ProcessingDetailsProps;
    readonly permissions: ProcessingDetailsPermissions;
}
