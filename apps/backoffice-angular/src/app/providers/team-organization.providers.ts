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
import {
    AgentsPerformancesFacade,
    AgentsPerformancesHistoryFacade,
    AgentsPerformancesHistoryUseCase,
    AgentsPerformancesUseCase,
    DailyGoalFacade,
    DailyGoalUseCase,
    ParticipantsFacade,
    ParticipantsFindOneFacade,
    ParticipantsFindOneUseCase,
    ParticipantsSelectFacade,
    ParticipantsSelectUseCase,
    ParticipantsUseCase,
    TeamsFacade,
    TeamsFindOneFacade,
    TeamsFindOneUseCase,
    TeamsPermissionsFacade,
    TeamsPermissionsUseCase,
    TeamsSelectFacade,
    TeamsSelectUseCase,
    TeamsUseCase,
} from '@cmz/team-organization-application';

/**
 * Composition root du module `team-organization` : wire les ports domaine
 * (`participants` + `teams`) à leurs implémentations `data`, scopée à
 * l'injecteur de route (`app.routes.ts`, `loadChildren`).
 *
 * OPS-25bis (2026-08-21) : même correctif que `provideAuthentication()` —
 * chaque `XxxUseCase`/`XxxFacade` est passé à
 * `@Service({ autoProvided: false })` et fourni explicitement ci-dessous,
 * dans le même injecteur que son `Repository`.
 *
 * ANOMALIE PRÉ-EXISTANTE (non introduite par OPS-25bis, distincte du bug
 * lazy-provider) : `AgentsPerformancesRepository`, `AgentsPerformancesHistoryRepository`,
 * `DailyGoalRepository` et `ParticipantsSelectRepository` ont chacun une
 * classe `abstract` (domain) et une `...Impl` (data) mais AUCUN binding
 * `{ provide: X, useClass: XImpl }` nulle part dans l'app (ni ici, ni dans
 * `app.config.ts`). Leurs UseCase/Facade sont bien passés à
 * `@Service({ autoProvided: false })` (cohérent : le token injecté est un
 * repository domaine scopé au module, pas un service root-global) et sont
 * ajoutés ci-dessous, mais `AgentsPerformancesUseCase`,
 * `AgentsPerformancesHistoryUseCase`, `DailyGoalUseCase` et
 * `ParticipantsSelectUseCase` lèveront toujours un `NullInjectorError`
 * synchrone tant que ces 4 Repository ne sont pas ajoutés à ce tableau
 * (ex. `{ provide: AgentsPerformancesRepository, useClass: AgentsPerformancesRepositoryImpl }`).
 * Non corrigé ici : hors périmètre OPS-25bis (ce n'est pas une régression de
 * la migration lazy-provider, le binding manquait déjà avant elle) — à
 * traiter dans un ticket séparé.
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
        ParticipantsUseCase,
        ParticipantsFindOneUseCase,
        ParticipantsFacade,
        ParticipantsFindOneFacade,
        TeamsUseCase,
        TeamsFindOneUseCase,
        TeamsSelectUseCase,
        TeamsPermissionsUseCase,
        TeamsFacade,
        TeamsFindOneFacade,
        TeamsSelectFacade,
        TeamsPermissionsFacade,
        // ANOMALIE (voir docstring ci-dessus) : ces 4 UseCase/Facade sont
        // fournis ici (chaîne DI correcte côté application) mais leur
        // Repository domaine n'a AUCUN binding useClass nulle part dans
        // l'app — NullInjectorError garanti tant que ce n'est pas corrigé
        // séparément (hors scope OPS-25bis).
        ParticipantsSelectUseCase,
        ParticipantsSelectFacade,
        AgentsPerformancesUseCase,
        AgentsPerformancesFacade,
        AgentsPerformancesHistoryUseCase,
        AgentsPerformancesHistoryFacade,
        DailyGoalUseCase,
        DailyGoalFacade,
    ];
}
