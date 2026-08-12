import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import {
    TeamsFacade,
    TeamsPermissionsFacade,
} from '@cmz/team-organization-application';
import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import {
    FieldComponent,
    FormMode,
    REPORT_TYPE_OPTIONS,
    TELECOM_OPERATOR_OPTIONS,
} from '@cmz/shared-ui';
import { TeamsFormStore } from '../stores/teams-form.store';

const T = 'TEAM_ORGANIZATION.TEAMS';

/**
 * Formulaire `teams` — Signal Forms. `reportTypes`/`operators` en cases à
 * cocher (même pattern que `technology` sur `mobile-network`).
 * `permissions` : liste de cases à cocher **aplatie** (simplification
 * actée, cf. domaine) dont la source diffère selon le mode — création :
 * `TeamsPermissionsFacade` (arbre complet, tout décoché) ; édition : les
 * permissions embarquées dans `TeamsFindOneFacade` (déjà cochées/décochées
 * selon l'état réel de l'équipe).
 */
@Component({
    selector: 'cmz-teams-form',
    imports: [FormField, FieldComponent],
    providers: [TeamsFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-2xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

            <cmz-field
                [label]="ns + '.FORM.NAME'"
                [field]="store.form.name"
                for="name"
                [required]="true"
            >
                <input
                    id="name"
                    [formField]="store.form.name"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.DESCRIPTION'"
                [field]="store.form.description"
                for="description"
                [required]="true"
            >
                <textarea
                    id="description"
                    rows="3"
                    [formField]="store.form.description"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                ></textarea>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.REPORT_TYPES'"
                [field]="store.form.reportTypes"
                for="reportTypes"
                [required]="true"
            >
                <div id="reportTypes" class="flex flex-wrap gap-3">
                    @for (option of reportTypeOptions; track option.value) {
                        <label class="flex items-center gap-1 text-sm">
                            <input
                                type="checkbox"
                                [checked]="isReportTypeChecked(option.value)"
                                [disabled]="isDetails()"
                                (change)="store.toggleReportType(option.value)"
                            />
                            {{ t(option.label) }}
                        </label>
                    }
                </div>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.OPERATORS'"
                [field]="store.form.operators"
                for="operators"
                [required]="true"
            >
                <div id="operators" class="flex flex-wrap gap-3">
                    @for (option of operatorOptions; track option.value) {
                        <label class="flex items-center gap-1 text-sm">
                            <input
                                type="checkbox"
                                [checked]="isOperatorChecked(option.value)"
                                [disabled]="isDetails()"
                                (change)="store.toggleOperator(option.value)"
                            />
                            {{ t(option.label) }}
                        </label>
                    }
                </div>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.PERMISSIONS'"
                [field]="store.form.permissions"
                for="permissions"
            >
                <div id="permissions" class="flex flex-wrap gap-3">
                    @for (option of permissionOptions(); track option.value) {
                        <label class="flex items-center gap-1 text-sm">
                            <input
                                type="checkbox"
                                [checked]="isPermissionChecked(option.value)"
                                [disabled]="isDetails()"
                                (change)="store.togglePermission(option.value)"
                            />
                            {{ option.label }}
                        </label>
                    }
                </div>
            </cmz-field>

            <div class="flex items-center justify-end gap-2">
                <button
                    type="button"
                    (click)="onCancel()"
                    class="rounded border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                >
                    {{ t('COMMON.CANCEL') }}
                </button>
                @if (!isDetails()) {
                    <button
                        type="submit"
                        [disabled]="store.form().invalid() || saving()"
                        class="rounded bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
                    >
                        {{ t('COMMON.SAVE') }}
                    </button>
                }
            </div>
        </form>
    `,
})
export class TeamsFormComponent {
    protected readonly store = inject(TeamsFormStore);
    private readonly facade = inject(TeamsFacade);
    private readonly permissionsFacade = inject(TeamsPermissionsFacade);
    private readonly i18n = inject(TRANSLATION_PORT);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    protected readonly reportTypeOptions = REPORT_TYPE_OPTIONS;
    protected readonly operatorOptions = TELECOM_OPERATOR_OPTIONS;

    /**
     * Options de permission affichables : arbre complet (tout décoché) en
     * création, permissions embarquées (état réel) en édition/détails.
     */
    protected readonly permissionOptions = computed(() =>
        this.mode() === 'create'
            ? this.permissionsFacade.permissions()
            : (this.store.findOneItem()?.permissions ?? [])
    );

    private readonly params = toSignal(this.route.queryParamMap);
    private lastSeenSuccess = this.facade.actionSuccess();

    constructor() {
        const params = this.params();
        const uniqId = params?.get('uniqId') ?? null;
        const ref = (params?.get('ref') as FormMode) ?? 'create';
        this.store.setMode(uniqId, ref);

        if (ref === 'create') {
            this.permissionsFacade.load({ forceRefresh: true });
        }

        effect(() => {
            const success = this.facade.actionSuccess();
            if (success > this.lastSeenSuccess) {
                this.lastSeenSuccess = success;
                this.onCancel();
            }
        });
    }

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected isReportTypeChecked(value: ReportType): boolean {
        return this.store.model().reportTypes.includes(value);
    }

    protected isOperatorChecked(value: TelecomOperator): boolean {
        return this.store.model().operators.includes(value);
    }

    protected isPermissionChecked(value: string): boolean {
        return this.store.model().permissions.includes(value);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.store.form().invalid()) {
            return;
        }
        const { name, description, reportTypes, operators, permissions } =
            this.store.model();
        const payload = {
            name,
            description,
            reportTypes,
            operators,
            permissions,
        };
        if (this.mode() === 'edit') {
            const uniqId = this.params()?.get('uniqId') ?? '';
            this.facade.update({ uniqId, ...payload });
        } else {
            this.facade.create(payload);
        }
    }

    protected onCancel(): void {
        void this.router.navigate(['../'], { relativeTo: this.route });
    }
}
