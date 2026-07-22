import { ResourcesDeleteCommand } from '@pages/seos-reference/application/commands/resources/resources-delete.command';
import { ResourcesDeleteContract } from '@pages/seos-reference/domain/contracts/resources/resources-delete.contract';

export function resourcesDeleteCommandMapper(
    command: ResourcesDeleteCommand
): ResourcesDeleteContract {
    return {
        uniqId: command.uniqId,
    };
}
