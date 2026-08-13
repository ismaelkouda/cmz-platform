/**
 * Setup Vitest pour les specs `*.rxresource.spec.ts` (voir
 * `tools/vitest-lib-rxresource.config.ts` pour le pourquoi).
 *
 * Initialise l'environnement de test Angular une seule fois par process —
 * `TestBed.initTestEnvironment` lève si appelé deux fois, d'où le guard.
 * Pas de `zone.js` : ce dépôt est zoneless, `TestBed` fonctionne nativement
 * sans zone en Angular 22.
 */
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import {
    BrowserTestingModule,
    platformBrowserTesting,
} from '@angular/platform-browser/testing';

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
