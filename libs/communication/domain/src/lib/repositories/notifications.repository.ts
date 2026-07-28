import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { NotificationsFilterContract } from '../contracts/notifications-filter.contract';
import { NotificationsReadOneValidateContract } from '../contracts/notifications-read-one.validate-contract';
import { NotificationsEntity } from '../entities/notifications.entity';

/**
 * Pas de `create`/`update`/`delete` : entité 100 % pilotée par le backend
 * (une notification naît d'un événement système, jamais d'une saisie
 * utilisateur) — même précédent que `AccessLogsRepository`
 * (settings-security), zéro mutation de type CRUD classique. `readOne`
 * marque une notification comme lue, `readAll` les marque toutes lues.
 */
export abstract class NotificationsRepository {
    abstract execute(
        filter: NotificationsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<NotificationsEntity>>;
    abstract readOne(
        validContract: NotificationsReadOneValidateContract
    ): Observable<MessageEntity>;
    abstract readAll(): Observable<MessageEntity>;
}
