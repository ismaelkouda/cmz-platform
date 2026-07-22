import { Injectable, inject } from '@angular/core';
import { ResourcesUpdateCommand } from '@pages/seos-reference/application/commands/resources/resources-update.command';
import { ResourcesUpdateHandler } from '@pages/seos-reference/application/commands-handlers/resources/resources-update.handler';
import { MessageResponseDto } from '@shared/data/dto/simple-response.dto';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesUpdateBus {
    private readonly updateHandler = inject(ResourcesUpdateHandler);

    dispatch<T>(command: T): Observable<MessageResponseDto> {
        if (command instanceof ResourcesUpdateCommand) {
            return this.updateHandler.execute(command);
        }
        throw new Error('No handler found for command');
    }
}
