import { DOCUMENT } from '@angular/common';
import {
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import {
    CONFIRM_DIALOG_PORT,
    WorkspaceService,
    WorkspaceView,
} from '@cmz/shared-ui';
import { LocalizeTranslationService } from '@cmz/shared-application';
import { filter } from 'rxjs';
import { canonicalWorkspaceUrl } from './workspace-capacity.guard';
import {
    WorkspaceAccessMonitor,
    workspaceAccessPath,
} from './workspace-access-monitor.service';

@Component({
    selector: 'app-workspace-shell',
    imports: [RouterOutlet, Toolbar, ToolbarWidget],
    templateUrl: './workspace-shell.component.html',
    styleUrl: './workspace-shell.component.scss',
})
export class WorkspaceShellComponent {
    private readonly router = inject(Router);
    private readonly i18n = inject(LocalizeTranslationService);
    private readonly confirm = inject(CONFIRM_DIALOG_PORT);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly strip = viewChild<ElementRef<HTMLElement>>('strip');
    private resizeObserver: ResizeObserver | null = null;

    protected readonly workspace = inject(WorkspaceService);
    protected readonly views = this.workspace.views;
    protected readonly overflowing = signal(false);
    protected readonly canScrollPrevious = signal(false);
    protected readonly canScrollNext = signal(false);
    protected readonly canCloseCurrent = computed(
        () => this.workspace.activeView()?.closable === true
    );
    protected readonly canCloseOthers = computed(() => {
        const activeId = this.workspace.activeView()?.id;
        return this.views().some(
            (view) => view.closable && view.id !== activeId
        );
    });
    protected readonly canCloseAny = computed(() =>
        this.views().some(({ closable }) => closable)
    );
    protected readonly ownedTabIds = computed(() =>
        this.views()
            .map((view) => this.tabDomId(view.id))
            .join(' ')
    );
    protected readonly activeTabId = computed(() => {
        const active = this.workspace.activeView();
        return active ? this.tabDomId(active.id) : null;
    });

    constructor() {
        // Instancie la réconciliation des autorisations seulement dans le
        // shell authentifié ; son effect reste ensuite lié à l'injecteur root.
        inject(WorkspaceAccessMonitor);
        this.router.events
            .pipe(
                filter(
                    (event): event is NavigationEnd =>
                        event instanceof NavigationEnd
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.registerCurrentRoute());

        afterNextRender(() => {
            this.resizeObserver = new ResizeObserver(() =>
                this.updateOverflow()
            );
            const strip = this.strip()?.nativeElement;
            if (strip) this.resizeObserver.observe(strip);
            this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
            this.updateOverflow();
        });
    }

    protected activate(id: string): void {
        void this.workspace.activate(id);
    }

    protected async requestClose(view: WorkspaceView): Promise<void> {
        if (!(await this.confirmDiscard([view]))) return;
        const index = this.views().findIndex(({ id }) => id === view.id);
        const wasActive = view.lifecycle === 'active';
        if (
            await this.workspace.close(view.id, {
                discardDirty: view.dirty,
            })
        ) {
            if (wasActive) {
                const active = this.workspace.activeView();
                if (active) this.focusTabAfterDialog(active.id);
            } else {
                this.focusNearestTab(index);
            }
            this.updateOverflowSoon();
        }
    }

    protected async closeCurrent(): Promise<void> {
        const active = this.workspace.activeView();
        if (active?.closable) await this.requestClose(active);
    }

    protected async closeOthers(): Promise<void> {
        const active = this.workspace.activeView();
        if (!active) return;
        await this.requestBulkClose(
            this.views().filter(
                (view) => view.closable && view.id !== active.id
            )
        );
    }

    protected async closeAllExceptPinned(): Promise<void> {
        await this.requestBulkClose(
            this.views().filter(({ closable }) => closable)
        );
    }

    protected onTabKeydown(event: KeyboardEvent, view: WorkspaceView): void {
        const tabs = this.views();
        const index = tabs.findIndex(({ id }) => id === view.id);
        let targetIndex: number | null = null;
        if (event.key === 'ArrowLeft') targetIndex = Math.max(0, index - 1);
        if (event.key === 'ArrowRight')
            targetIndex = Math.min(tabs.length - 1, index + 1);
        if (event.key === 'Home') targetIndex = 0;
        if (event.key === 'End') targetIndex = tabs.length - 1;
        if (targetIndex !== null) {
            event.preventDefault();
            this.focusTab(tabs[targetIndex].id);
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.activate(view.id);
        }
        if (event.key === 'Delete' && view.closable) {
            event.preventDefault();
            void this.requestClose(view);
        }
    }

    protected scrollTabs(direction: -1 | 1): void {
        this.strip()?.nativeElement.scrollBy({
            left: direction * 240,
            behavior: 'auto',
        });
    }

    protected updateOverflow(): void {
        const element = this.strip()?.nativeElement;
        if (!element) {
            this.overflowing.set(false);
            this.canScrollPrevious.set(false);
            this.canScrollNext.set(false);
            return;
        }
        const maxScrollLeft = Math.max(
            0,
            element.scrollWidth - element.clientWidth
        );
        this.overflowing.set(maxScrollLeft > 1);
        this.canScrollPrevious.set(element.scrollLeft > 1);
        this.canScrollNext.set(element.scrollLeft < maxScrollLeft - 1);
    }

    protected tabDomId(id: string): string {
        return `workspace-tab-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    }

    protected translate(key: string, params?: Record<string, string>): string {
        return this.i18n.translate(key, params);
    }

    private registerCurrentRoute(): void {
        const id = canonicalWorkspaceUrl(this.router.url);
        let cursor = this.router.routerState.snapshot.root;
        const routeChain = [cursor];
        while (cursor.firstChild) {
            cursor = cursor.firstChild;
            routeChain.push(cursor);
        }
        const belongsToWorkspace = routeChain.some(
            ({ data }) => data['workspaceRoot'] === true
        );
        if (!belongsToWorkspace) return;

        const titleToken = [...routeChain]
            .reverse()
            .map(({ data }) => data['breadcrumb'] ?? data['workspaceTitle'])
            .find((value): value is string => typeof value === 'string');
        const title =
            id === '/dashboard'
                ? this.i18n.translate('WORKSPACE.DASHBOARD')
                : titleToken
                  ? this.i18n.translate(titleToken)
                  : this.humanizeUrl(id);
        this.workspace.registerNavigation({
            id,
            url: this.router.url,
            title,
            pinned: id === '/dashboard',
            accessPath: workspaceAccessPath(routeChain),
        });
        this.updateOverflowSoon();
    }

    private async requestBulkClose(views: WorkspaceView[]): Promise<void> {
        if (!(await this.confirmDiscard(views))) return;
        await this.workspace.closeMany(
            views.map(({ id }) => id),
            { discardDirty: true }
        );
        this.updateOverflowSoon();
    }

    private async confirmDiscard(views: WorkspaceView[]): Promise<boolean> {
        for (const view of views.filter(({ dirty }) => dirty)) {
            const confirmed = await this.confirm.confirm(
                this.i18n.translate('WORKSPACE.DISCARD.MESSAGE', {
                    title: view.title,
                }),
                {
                    title: this.i18n.translate('WORKSPACE.DISCARD.TITLE'),
                    confirmText: this.i18n.translate(
                        'WORKSPACE.DISCARD.CONFIRM'
                    ),
                    cancelText: this.i18n.translate('COMMON.CANCEL'),
                }
            );
            if (!confirmed) return false;
        }
        return true;
    }

    private humanizeUrl(url: string): string {
        const segments = url.split('/').filter(Boolean);
        const leaf = segments.at(-1);
        const meaningful =
            leaf === 'list' || leaf === 'form' ? segments.at(-2) : leaf;
        return (meaningful ?? this.translate('WORKSPACE.VIEW_FALLBACK'))
            .replaceAll('-', ' ')
            .replace(/^./, (letter) => letter.toUpperCase());
    }

    private focusNearestTab(previousIndex: number): void {
        const views = this.views();
        const next = views[Math.min(previousIndex, views.length - 1)];
        if (next) this.focusTabAfterDialog(next.id);
    }

    private focusTabAfterDialog(id: string): void {
        // `<dialog>.close()` restaure nativement le focus après les microtasks.
        // Un macrotask garantit que notre cible survivante gagne ensuite, y
        // compris lorsque le déclencheur du dialogue vient d'être supprimé.
        setTimeout(() => this.focusTab(id));
    }

    private focusTab(id: string): void {
        this.document.getElementById(this.tabDomId(id))?.focus();
    }

    private updateOverflowSoon(): void {
        queueMicrotask(() => this.updateOverflow());
    }
}
