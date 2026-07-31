import {
    ReportSourceDto,
    ReportTypeDto,
    SimpleResponseDto,
    TelecomOperatorDto,
} from '@cmz/shared-data';
import { ActorDto } from '@cmz/shared-data';
import { AdministrativeBoundaryDto } from '@cmz/shared-data';
import { LocationMethodDto } from '@cmz/shared-data';
import { LocationTypeDto } from '@cmz/shared-data';

export type ReportStatesDetailsStatusApiDto =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'abandoned'
    | 'in-progress'
    | 'terminated'
    | 'confirmed';

export type ReportStatesDetailsQualificationStateApiDto =
    'completed' | 'pending';

export interface ReportStatesDetailsItemApiDto {
    uniq_id: string;
    request_report_uniq_id: string;
    source: ReportSourceDto;
    location_method: LocationMethodDto;
    location_type: LocationTypeDto;
    lat: string;
    long: string;
    what3words: string;
    place_description: string;
    location_name: string;
    report_type: ReportTypeDto;
    operators: TelecomOperatorDto[];
    place_photo: string;
    access_place_photo: string;
    description: string;
    initiator_phone_number: string;
    processed_at: string;
    approved_at: string | null;
    finalized_at: string | null;
    rejected_at: string | null;
    confirmed_at: string | null;
    abandoned_at: string | null;
    acknowledged_at: string | null;
    reason: string | null;
    callback_type: string | null;
    status: ReportStatesDetailsStatusApiDto;
    qualification_state: ReportStatesDetailsQualificationStateApiDto | null;
    processing_state: 'pending' | 'in-progress' | null;
    finalization_state: 'pending' | 'in-progress' | null;
    state:
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'in-progress'
        | 'completed'
        | 'terminated';
    deny_count: number;
    confirm_count: number;
    acknowledged_comment: string | null;
    processed_comment: string | null;
    finalized_comment: string | null;
    approved_comment: string | null;
    rejected_comment: string | null;
    confirmed_comment: string | null;
    abandoned_comment: string | null;
    duplicate_of: string | null;
    is_duplicated: boolean;
    position: string;
    created_at: string;
    reported_at: string;
    updated_at: string;
    region_id: number;
    department_id: number;
    municipality_code: number;
    initiator: ActorDto | null;
    acknowledged_by: ActorDto | null;
    finalized_by: ActorDto | null;
    approved_by: ActorDto | null;
    rejected_by: ActorDto | null;
    processed_by: ActorDto | null;
    confirmed_by: ActorDto | null;
    abandoned_by: ActorDto | null;
    region: AdministrativeBoundaryDto;
    department: AdministrativeBoundaryDto;
    municipality: AdministrativeBoundaryDto;
}

export type ReportStatesDetailsResponseDto =
    SimpleResponseDto<ReportStatesDetailsItemApiDto>;
