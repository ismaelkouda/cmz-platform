import { Provider } from '@angular/core';
import {
    ParticipantsFindOneRepository,
    ParticipantsRepository,
    TeamsFindOneRepository,
    TeamsPermissionsRepository,
    TeamsRepository,
    TeamsSelectRepository,
} from '@cmz/team-organization-domain';
import {
    ParticipantsFindOneRepositoryImpl,
    ParticipantsRepositoryImpl,
    TeamsFindOneRepositoryImpl,
    TeamsPermissionsRepositoryImpl,
    TeamsRepositoryImpl,
    TeamsSelectRepositoryImpl,
} from '@cmz/team-organization-data';

/**
 * Composition root du module `team-organization` : wire les ports domaine
 * (`participants` + `teams`) à leurs implémentations `data`. À fournir au
 * niveau app, même précédent que `provideCoverageAreas()`.
 */
export function provideTeamOrganization(): Provider[] {
    return [
        {
            provide: ParticipantsRepository,
            useClass: ParticipantsRepositoryImpl,
        },
        {
            provide: ParticipantsFindOneRepository,
            useClass: ParticipantsFindOneRepositoryImpl,
        },
        { provide: TeamsRepository, useClass: TeamsRepositoryImpl },
        {
            provide: TeamsFindOneRepository,
            useClass: TeamsFindOneRepositoryImpl,
        },
        {
            provide: TeamsSelectRepository,
            useClass: TeamsSelectRepositoryImpl,
        },
        {
            provide: TeamsPermissionsRepository,
            useClass: TeamsPermissionsRepositoryImpl,
        },
    ];
}
