import { DepartmentsByRegionIdEntity } from '@cmz/administrative-boundary-domain';
import { STATUS_LABEL } from '../constants/status-label.constant';
import { statusStyleOf } from '../mappers/status-style.mapper';
import { DepartmentsByRegionIdVmProps } from './departments-by-region-id-vm-props.interface';

/** Presenter (UI) sans permission ni action — vue lecture seule. */
export class DepartmentsByRegionIdPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: DepartmentsByRegionIdEntity): DepartmentsByRegionIdVmProps {
        return {
            uniqId: item.uniqId,
            code: item.code,
            name: item.name,
            description: item.description,
            populationSize: item.populationSize,
            municipalitiesCount: item.municipalitiesCount,
            status: item.status,
            statusLabel: this.t(STATUS_LABEL[item.status]),
            statusStyle: statusStyleOf(item.status),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
    }
}
