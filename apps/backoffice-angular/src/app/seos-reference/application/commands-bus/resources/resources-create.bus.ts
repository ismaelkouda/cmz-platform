import { Injectable, inject } from '@angular/core';
import { ResourcesCreateCommand } from '@pages/seos-reference/application/commands/resources/resources-create.command';
import { ResourcesCreateHandler } from '@pages/seos-reference/application/commands-handlers/resources/resources-create.handler';
import { MessageResponseDto } from '@shared/data/dto/simple-response.dto';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesCreateBus {
    private readonly createHandler = inject(ResourcesCreateHandler);

    dispatch<T>(command: T): Observable<MessageResponseDto> {
        if (command instanceof ResourcesCreateCommand) {
            return this.createHandler.execute(command);
        }
        throw new Error('No handler found for command');
    }
}
