import { ResourcesEntity } from '@pages/seos-reference/domain/entities/resources/resources.entity';
import { ResourcesVmProps } from '@pages/seos-reference/presentation/adapters/resources/resources-vm-props.interface';

export class ResourcesPresenter {
    map(item: ResourcesEntity): ResourcesVmProps {
        return {
            uniqId: item.uniqId,
            code: item.code,
            name: item.name,
            description: item.description,
            updatedAt: item.updatedAt,
        };
    }
}
