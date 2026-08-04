import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { MessagingTarget, MessagingChannel } from '@cmz/communication-domain';
import { MessagingFacade } from '@cmz/communication-application';
import { TranslationPort } from '@cmz/shared-application';
import { FieldComponent, FormMode } from '@cmz/shared-ui';
import { MESSAGING_TYPE_OPTIONS } from '../constants/messaging-type-label.constant';
import { MESSAGING_TARGET_OPTIONS } from '../constants/messaging-target-label.constant';
import { MESSAGING_CHANNEL_OPTIONS } from '../constants/messaging-channel-label.constant';
import { MessagingFormStore } from '../stores/messaging-form.store';

const T = 'COMMUNICATION.MESSAGING';

/**
 * Formulaire `messaging` — Signal Forms. `targetType` pilote `reportId`
 * (cible = signalement précis) vs. cascade `region`/`department`/
 * `municipality` (cible = zone géographique) en exclusif, même esprit que
 * `type` pilotant `image`/`video` dans `content-management/news-form`.
 * Cascade région → département → commune : `municipality-form.component.ts`
 * (administrative-boundary), étendue d'un niveau. `channels` en cases à
 * cocher (`slide-form.component.ts`).
 */
@Component({
    selector: 'cmz-messaging-form',
    imports: [FormField, FieldComponent],
    providers: [MessagingFormStore],
    template: `
        <form (submit)="onSubmit($event)" class="flex max-w-2xl flex-col gap-4">
            <h1 class="text-lg font-semibold text-text">
                {{ t(ns + '.FORM.TITLE.' + mode().toUpperCase()) }}
            </h1>

            <cmz-field
                [label]="ns + '.FORM.TYPE'"
                [field]="store.form.type"
                for="type"
                [required]="true"
            >
                <select
                    id="type"
                    [formField]="store.form.type"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of typeOptions; track option.value) {
                        <option [value]="option.value">
                            {{ t(option.label) }}
                        </option>
                    }
                </select>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.TARGET_TYPE'"
                [field]="store.form.targetType"
                for="targetType"
                [required]="true"
            >
                <select
                    id="targetType"
                    [formField]="store.form.targetType"
                    (change)="onTargetTypeChange($event)"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                >
                    <option value="" disabled>
                        {{ t('COMMON.SELECT_PLACEHOLDER') }}
                    </option>
                    @for (option of targetTypeOptions; track option.value) {
                        <option [value]="option.value">
                            {{ t(option.label) }}
                        </option>
                    }
                </select>
            </cmz-field>

            @if (store.isReportTarget()) {
                <cmz-field
                    [label]="ns + '.FORM.REPORT_ID'"
                    [field]="store.form.reportId"
                    for="reportId"
                    [required]="true"
                >
                    <input
                        id="reportId"
                        [formField]="store.form.reportId"
                        class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                    />
                </cmz-field>
            }

            @if (store.isAreaTarget()) {
                <cmz-field
                    [label]="ns + '.FORM.REGION'"
                    [field]="store.form.region"
                    for="region"
                    [required]="true"
                >
                    <select
                        id="region"
                        [formField]="store.form.region"
                        (change)="onRegionChange($event)"
                        class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                    >
                        <option value="">
                            {{ t('COMMON.SELECT_PLACEHOLDER') }}
                        </option>
                        @for (
                            region of store.regionOptions();
                            track region.id
                        ) {
                            <option [value]="region.id">
                                {{ region.name }}
                            </option>
                        }
                    </select>
                </cmz-field>

                <cmz-field
                    [label]="ns + '.FORM.DEPARTMENT'"
                    [field]="store.form.department"
                    for="department"
                >
                    <select
                        id="department"
                        [formField]="store.form.department"
                        (change)="onDepartmentChange($event)"
                        class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                    >
                        <option value="">
                            {{ t('COMMON.SELECT_PLACEHOLDER') }}
                        </option>
                        @for (
                            department of store.departmentOptions();
                            track department.id
                        ) {
                            <option [value]="department.id">
                                {{ department.name }}
                            </option>
                        }
                    </select>
                </cmz-field>

                <cmz-field
                    [label]="ns + '.FORM.MUNICIPALITY'"
                    [field]="store.form.municipality"
                    for="municipality"
                >
                    <select
                        id="municipality"
                        [formField]="store.form.municipality"
                        class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                    >
                        <option value="">
                            {{ t('COMMON.SELECT_PLACEHOLDER') }}
                        </option>
                        @for (
                            municipality of store.municipalityOptions();
                            track municipality.id
                        ) {
                            <option [value]="municipality.id">
                                {{ municipality.name }}
                            </option>
                        }
                    </select>
                </cmz-field>
            }

            <cmz-field
                [label]="ns + '.FORM.CHANNELS'"
                [field]="store.form.channels"
                for="channels"
                [required]="true"
            >
                <div class="flex flex-wrap gap-4">
                    @for (option of channelOptions; track option.value) {
                        <label
                            class="flex items-center gap-2 text-sm text-text"
                        >
                            <input
                                type="checkbox"
                                [checked]="isChannelChecked(option.value)"
                                [disabled]="isDetails()"
                                (change)="onChannelToggle(option.value)"
                            />
                            {{ t(option.label) }}
                        </label>
                    }
                </div>
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.SUBJECT'"
                [field]="store.form.subject"
                for="subject"
                [required]="true"
            >
                <input
                    id="subject"
                    [formField]="store.form.subject"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                />
            </cmz-field>

            <cmz-field
                [label]="ns + '.FORM.CONTENT'"
                [field]="store.form.content"
                for="content"
                [required]="true"
            >
                <textarea
                    id="content"
                    rows="6"
                    [formField]="store.form.content"
                    class="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
                ></textarea>
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
export class MessagingFormComponent {
    protected readonly store = inject(MessagingFormStore);
    private readonly facade = inject(MessagingFacade);
    private readonly i18n = inject(TranslationPort);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly ns = T;
    protected readonly mode = this.store.mode;
    protected readonly isDetails = this.store.isDetails;
    protected readonly saving = computed(
        () => this.facade.actionState() === 'loading'
    );

    protected readonly typeOptions = MESSAGING_TYPE_OPTIONS;
    protected readonly targetTypeOptions = MESSAGING_TARGET_OPTIONS;
    protected readonly channelOptions = MESSAGING_CHANNEL_OPTIONS;

    private readonly params = toSignal(this.route.queryParamMap);
    private lastSeenSuccess = this.facade.actionSuccess();

    constructor() {
        const params = this.params();
        const uniqId = params?.get('uniqId') ?? null;
        const ref = (params?.get('ref') as FormMode) ?? 'create';
        this.store.setMode(uniqId, ref);

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

    protected onTargetTypeChange(event: Event): void {
        const targetType = (event.target as HTMLSelectElement)
            .value as MessagingTarget;
        this.store.setTargetType(targetType);
    }

    /** Cascade : un changement de région réinitialise département + commune. */
    protected onRegionChange(event: Event): void {
        const region = (event.target as HTMLSelectElement).value;
        this.store.onRegionChange(region);
    }

    /** Cascade : un changement de département réinitialise la commune. */
    protected onDepartmentChange(event: Event): void {
        const department = (event.target as HTMLSelectElement).value;
        this.store.onDepartmentChange(department);
    }

    protected isChannelChecked(value: MessagingChannel): boolean {
        return this.store.model().channels.includes(value);
    }

    protected onChannelToggle(value: MessagingChannel): void {
        this.store.toggleChannel(value);
    }

    protected onSubmit(event: Event): void {
        event.preventDefault();
        if (this.store.form().invalid()) {
            return;
        }
        const {
            type,
            targetType,
            reportId,
            region,
            department,
            municipality,
            channels,
            subject,
            content,
        } = this.store.model();
        const payload = {
            type: type || undefined,
            targetType: targetType || undefined,
            reportId: reportId || undefined,
            region: region || undefined,
            department: department || undefined,
            municipality: municipality || undefined,
            channels,
            subject,
            content,
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
