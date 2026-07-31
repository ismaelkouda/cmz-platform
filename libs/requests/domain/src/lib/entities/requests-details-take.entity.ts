import { RequestsDetailsTakeContract } from '../contracts/requests-details-take.contract';
import { requestsDetailsTakeVo } from '../value-objects/requests-details-take.vo';

export class RequestsDetailsTakeEntity {
    constructor(public readonly uniqId: string) {}

    static fromContract(
        contract: RequestsDetailsTakeContract
    ): RequestsDetailsTakeEntity {
        return new RequestsDetailsTakeEntity(
            requestsDetailsTakeVo(contract).uniqId
        );
    }
}
