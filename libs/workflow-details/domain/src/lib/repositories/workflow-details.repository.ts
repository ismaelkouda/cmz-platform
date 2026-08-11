import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { WorkflowDetailsFilterContract } from '../contracts/workflow-details-filter.contract';
import { WorkflowDetailsEntity } from '../entities/workflow-details.entity';
import { WorkflowDetailsApproveEntity } from '../entities/workflow-details-approve.entity';
import { WorkflowDetailsRejectEntity } from '../entities/workflow-details-reject.entity';
import { WorkflowDetailsTakeEntity } from '../entities/workflow-details-take.entity';

/**
 * Port abstrait à étendre par module (`ReportStatesDetailsRepository`,
 * `RequestsDetailsRepository`, …) — pas à fournir directement en DI : deux
 * classes filles distinctes gardent des tokens Angular distincts, évitant
 * qu'un `provide: WorkflowDetailsRepositoryBase` écrase silencieusement
 * l'autre implémentation dans l'injecteur racine (memo
 * `factorisation-details-workflow.md` §3.3 — repository non unifié en
 * première itération).
 */
export abstract class WorkflowDetailsRepositoryBase {
    abstract execute(
        filter: WorkflowDetailsFilterContract,
        options?: FetchOptions
    ): Observable<WorkflowDetailsEntity>;

    abstract take(entity: WorkflowDetailsTakeEntity): Observable<void>;

    abstract approve(entity: WorkflowDetailsApproveEntity): Observable<void>;

    abstract reject(entity: WorkflowDetailsRejectEntity): Observable<void>;
}
