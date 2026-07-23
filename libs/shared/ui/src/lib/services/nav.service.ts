import { DestroyRef, Service, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, fromEvent } from 'rxjs';
import { Menu } from '../interfaces/menu.interface';

/**
 * État de la navigation (sidebar, responsive). Nettoyé : typé (aucun `any`),
 * code mort retiré, `takeUntilDestroyed` au lieu d'un Subject manuel
 * (corrige le `complete()` sans `next()` du source).
 */
@Service()
export class NavService {
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly screenWidth = signal<number>(window.innerWidth);

    listMenuItems: Menu[] = [];
    listMenu: Menu[] = [];
    user: unknown;

    search = false;
    language = false;
    megaMenu = false;
    levelMenu = false;
    fullScreen = false;
    megaMenuCollapse = window.innerWidth < 1199;
    collapseSidebar = window.innerWidth < 1100;
    horizontal = window.innerWidth >= 1100;

    constructor() {
        fromEvent(window, 'resize')
            .pipe(debounceTime(1000), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.onResize(window.innerWidth));

        if (window.innerWidth < 1100) {
            this.router.events
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => this.collapseOnMobile());
        }
    }

    private onResize(width: number): void {
        this.screenWidth.set(width);
        if (width < 1100) {
            this.collapseOnMobile();
            this.megaMenuCollapse = true;
        }
    }

    private collapseOnMobile(): void {
        this.collapseSidebar = true;
        this.megaMenu = false;
        this.levelMenu = false;
    }
}
