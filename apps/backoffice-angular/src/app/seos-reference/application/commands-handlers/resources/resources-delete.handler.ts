import { inject, Injectable } from '@angular/core';
import { resourcesDeleteCommandMapper } from '@pages/seos-reference/application/commands-mappers/resources/resources-delete.mapper';
import { ResourcesDeleteCommand } from '@pages/seos-reference/application/commands/resources/resources-delete.command';
import { ResourcesUseCase } from '@pages/seos-reference/application/use-cases/resources/resources.use-case';
import { MessageResponseDto } from '@shared/data/dto/simple-response.dto';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesDeleteHandler {
    private readonly useCase = inject(ResourcesUseCase);

    execute(command: ResourcesDeleteCommand): Observable<MessageResponseDto> {
        return this.useCase.delete(resourcesDeleteCommandMapper(command));
    }
}
