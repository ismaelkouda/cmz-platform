import { Service, inject, signal } from '@angular/core';
import { Router, RouteReuseStrategy } from '@angular/router';
import { EncodingDataService } from '@cmz/shared-infra';
import { CustomRouteReuseStrategy } from '../route-strategies/custom-route-reuse-strategy';
import { Tab } from '../interfaces/tab.interface';

/**
 * Onglets de navigation persistés (chiffrés). Lecture/écriture **asynchrones**
 * (Web Crypto). `signal` au lieu de BehaviorSubject (Angular 22).
 */
@Service()
export class TabService {
    private readonly router = inject(Router);
    private readonly routeReuseStrategy = inject(RouteReuseStrategy);
    private readonly encoding = inject(EncodingDataService);

    private readonly STORAGE_KEY = 'tabs';
    private readonly _tabs = signal<Tab[]>([]);
    readonly tabs = this._tabs.asReadonly();

    constructor() {
        void this.restore();
    }

    private async restore(): Promise<void> {
        const saved = await this.encoding.getEncrypted<Tab[]>(this.STORAGE_KEY);
        if (saved && saved.length > 0) {
            this._tabs.set(saved);
        } else {
            this.addTab('Tableau de bord', '/dashboard', false);
        }
    }

    private setTabs(tabs: Tab[]): void {
        this._tabs.set(tabs);
        if (tabs.length === 0) {
            this.encoding.remove(this.STORAGE_KEY);
            this.encoding.remove(`${this.STORAGE_KEY}_children_component`);
        } else {
            void this.encoding.saveEncrypted(this.STORAGE_KEY, tabs);
        }
    }

    addTab(title: string, path: string, closable = true): void {
        const id = this.generateId(path);
        const tabs = [...this._tabs()];
        if (tabs.some((tab) => tab.id === id)) {
            this.activateTab(id);
            return;
        }
        tabs.forEach((tab) => (tab.active = false));
        tabs.push({ id, title, path, active: true, closable });
        this.setTabs(tabs);
        void this.router.navigate([path]);
    }

    activateTab(id: string): void {
        const tabs = this._tabs().map((tab) => ({
            ...tab,
            active: tab.id === id,
        }));
        this.setTabs(tabs);
        const activeTab = tabs.find((tab) => tab.id === id);
        if (activeTab) {
            void this.router.navigate([activeTab.path]);
        }
    }

    closeTab(id: string): void {
        const tabs = this._tabs();
        const index = tabs.findIndex((tab) => tab.id === id);
        if (index === -1 || !tabs[index].closable) {
            return;
        }
        const closedPath = tabs[index].path;
        this.encoding.remove(closedPath);
        this.encoding.remove(`${closedPath}_children_component`);

        const wasActive = tabs[index].active;
        const remaining = tabs.filter((tab) => tab.id !== id);
        if (wasActive && remaining.length > 0) {
            const newActiveIndex = Math.min(index, remaining.length - 1);
            remaining[newActiveIndex].active = true;
            void this.router.navigate([remaining[newActiveIndex].path]);
        }
        this.setTabs(remaining);

        if (this.routeReuseStrategy instanceof CustomRouteReuseStrategy) {
            this.routeReuseStrategy.clearHandle(closedPath);
        }
    }

    closeAllTabsExceptDashboard(): void {
        const dashboardId = this.generateId('/dashboard');
        this._tabs().forEach((tab) => {
            this.encoding.remove(tab.path);
            this.encoding.remove(`${tab.path}_children_component`);
        });
        const kept = this._tabs().filter((tab) => tab.id === dashboardId);
        if (kept.length === 0) {
            return;
        }
        kept[0].active = true;
        this.setTabs(kept);
        void this.router.navigate(['/dashboard']);
    }

    private generateId(path: string): string {
        return path.replace(/[^a-zA-Z0-9]/g, '_');
    }
}
