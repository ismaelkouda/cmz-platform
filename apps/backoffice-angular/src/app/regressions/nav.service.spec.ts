import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavService } from '@cmz/shared-ui';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé. Placé ici (pas dans
 * `libs/shared/ui`) car les champs sont initialisés à la construction à
 * partir de `window.innerWidth`/`fromEvent(window, 'resize')` : `libs/*`
 * tourne sous Vitest `environment: 'node'`, où `window` n'existe pas du
 * tout — échec à l'import, pas à l'exécution d'un test précis. Seul
 * `apps/backoffice-angular` (jsdom) a un `window` réel.
 */
function setViewportWidth(width: number): void {
    Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: width,
    });
}

describe('NavService', () => {
    afterEach(() => {
        setViewportWidth(1280);
    });

    it('desktop (>= 1100px) : sidebar non repliée, mode horizontal actif', () => {
        setViewportWidth(1280);
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const service = TestBed.inject(NavService);

        expect(service.collapseSidebar).toBe(false);
        expect(service.horizontal).toBe(true);
    });

    it('mobile (< 1100px) : sidebar repliée dès la construction, mode horizontal inactif', () => {
        setViewportWidth(800);
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const service = TestBed.inject(NavService);

        expect(service.collapseSidebar).toBe(true);
        expect(service.horizontal).toBe(false);
    });

    it('megaMenuCollapse est vrai strictement sous 1199px, faux à 1199px et au-dessus', () => {
        setViewportWidth(1198);
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const belowThreshold = TestBed.inject(NavService);
        expect(belowThreshold.megaMenuCollapse).toBe(true);

        TestBed.resetTestingModule();
        setViewportWidth(1199);
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const atThreshold = TestBed.inject(NavService);
        expect(atThreshold.megaMenuCollapse).toBe(false);
    });

    it('screenWidth reflète window.innerWidth au démarrage', () => {
        setViewportWidth(1024);
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const service = TestBed.inject(NavService);

        expect(service.screenWidth()).toBe(1024);
    });

    it('redimensionner sous 1100px après démarrage replie la sidebar et le mega-menu (debounce 1s)', async () => {
        setViewportWidth(1280);
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const service = TestBed.inject(NavService);
        expect(service.collapseSidebar).toBe(false);

        setViewportWidth(900);
        window.dispatchEvent(new Event('resize'));
        await new Promise((r) => setTimeout(r, 1100));

        expect(service.screenWidth()).toBe(900);
        expect(service.collapseSidebar).toBe(true);
        expect(service.megaMenuCollapse).toBe(true);
    });

    it('listMenuItems/listMenu démarrent vides, search/language/megaMenu/levelMenu/fullScreen démarrent à false', () => {
        setViewportWidth(1280);
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const service = TestBed.inject(NavService);

        expect(service.listMenuItems).toEqual([]);
        expect(service.listMenu).toEqual([]);
        expect(service.search).toBe(false);
        expect(service.language).toBe(false);
        expect(service.megaMenu).toBe(false);
        expect(service.levelMenu).toBe(false);
        expect(service.fullScreen).toBe(false);
    });
});
