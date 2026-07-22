import { inject, Injectable } from '@angular/core';
import { resourcesUpdateCommandMapper } from '@pages/seos-reference/application/commands-mappers/resources/resources-update.mapper';
import { ResourcesUpdateCommand } from '@pages/seos-reference/application/commands/resources/resources-update.command';
import { ResourcesUseCase } from '@pages/seos-reference/application/use-cases/resources/resources.use-case';
import { MessageResponseDto } from '@shared/data/dto/simple-response.dto';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesUpdateHandler {
    private readonly useCase = inject(ResourcesUseCase);

    execute(command: ResourcesUpdateCommand): Observable<MessageResponseDto> {
        return this.useCase.update(resourcesUpdateCommandMapper(command));
    }
}
