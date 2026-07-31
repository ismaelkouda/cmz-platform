import { ReportStatesDetailsTakeContract } from '../contracts/report-states-details-take.contract';
import { reportStatesDetailsTakeVo } from '../value-objects/report-states-details-take.vo';

export class ReportStatesDetailsTakeEntity {
    constructor(public readonly uniqId: string) {}

    static fromContract(
        contract: ReportStatesDetailsTakeContract
    ): ReportStatesDetailsTakeEntity {
        return new ReportStatesDetailsTakeEntity(
            reportStatesDetailsTakeVo(contract).uniqId
        );
    }
}
