import { Injectable, inject } from '@angular/core';
import { ResourcesDeleteCommand } from '@pages/seos-reference/application/commands/resources/resources-delete.command';
import { ResourcesDeleteHandler } from '@pages/seos-reference/application/commands-handlers/resources/resources-delete.handler';
import { MessageResponseDto } from '@shared/data/dto/simple-response.dto';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesDeleteBus {
    private readonly deleteHandler = inject(ResourcesDeleteHandler);

    dispatch<T>(command: T): Observable<MessageResponseDto> {
        if (command instanceof ResourcesDeleteCommand) {
            return this.deleteHandler.execute(command);
        }
        throw new Error('No handler found for command');
    }
}
