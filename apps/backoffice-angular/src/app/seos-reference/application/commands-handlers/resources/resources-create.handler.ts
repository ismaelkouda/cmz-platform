import { inject, Injectable } from '@angular/core';
import { resourcesCreateCommandMapper } from '@pages/seos-reference/application/commands-mappers/resources/resources-create.mapper';
import { ResourcesCreateCommand } from '@pages/seos-reference/application/commands/resources/resources-create.command';
import { ResourcesUseCase } from '@pages/seos-reference/application/use-cases/resources/resources.use-case';
import { MessageResponseDto } from '@shared/data/dto/simple-response.dto';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesCreateHandler {
    private readonly useCase = inject(ResourcesUseCase);

    execute(command: ResourcesCreateCommand): Observable<MessageResponseDto> {
        return this.useCase.create(resourcesCreateCommandMapper(command));
    }
}
