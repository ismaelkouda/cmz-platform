import { ResourcesCreateCommand } from '@pages/seos-reference/application/commands/resources/resources-create.command';
import { ResourcesCreateContract } from '@pages/seos-reference/domain/contracts/resources/resources-create.contract';

export function resourcesCreateCommandMapper(
    command: ResourcesCreateCommand
): ResourcesCreateContract {
    return {
        code: command.code,
        name: command.name,
        description: command.description,
    };
}
