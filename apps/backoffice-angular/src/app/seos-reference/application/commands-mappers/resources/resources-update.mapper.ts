import { ResourcesUpdateCommand } from '@pages/seos-reference/application/commands/resources/resources-update.command';
import { ResourcesUpdateContract } from '@pages/seos-reference/domain/contracts/resources/resources-update.contract';

export function resourcesUpdateCommandMapper(
    command: ResourcesUpdateCommand
): ResourcesUpdateContract {
    return {
        uniqId: command.uniqId,
        code: command.code,
        name: command.name,
        description: command.description,
    };
}
