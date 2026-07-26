import { MunicipalitiesByDepartmentIdEntity } from '@cmz/administrative-boundary-domain';
import { STATUS_LABEL } from '../constants/status-label.constant';
import { statusStyleOf } from '../mappers/status-style.mapper';
import { MunicipalitiesByDepartmentIdVmProps } from './municipalities-by-department-id-vm-props.interface';

/** Presenter (UI) sans permission ni action — vue lecture seule. */
export class MunicipalitiesByDepartmentIdPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: MunicipalitiesByDepartmentIdEntity
    ): MunicipalitiesByDepartmentIdVmProps {
        return {
            uniqId: item.uniqId,
            code: item.code,
            name: item.name,
            description: item.description,
            populationSize: item.populationSize,
            status: item.status,
            statusLabel: this.t(STATUS_LABEL[item.status]),
            statusStyle: statusStyleOf(item.status),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
    }
}
