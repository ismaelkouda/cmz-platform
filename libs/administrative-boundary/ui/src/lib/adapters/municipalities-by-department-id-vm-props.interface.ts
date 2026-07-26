import { Status } from '@cmz/administrative-boundary-domain';
import { StatusStyle } from '../enums/status-style.enum';

/** Vue imbriquée en lecture seule : pas de `dropdownActions`. */
export interface MunicipalitiesByDepartmentIdVmProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    populationSize: number;
    status: Status;
    statusLabel: string;
    statusStyle: StatusStyle;
    createdAt: string;
    updatedAt: string;
}
