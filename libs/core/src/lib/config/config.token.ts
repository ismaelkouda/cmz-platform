import { InjectionToken, inject } from '@angular/core';
import { AppConfig } from './config.type';
import { assertAppConfig } from './validate-app-config';

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
    providedIn: 'root',
    factory: (): AppConfig => assertAppConfig(window.__env),
});

export const REPORT_API_URL = new InjectionToken<string>('REPORT_API_URL', {
    providedIn: 'root',
    factory: (): string => inject(APP_CONFIG).reportUrl,
});

export const AUTH_API_URL = new InjectionToken<string>('AUTH_API_URL', {
    providedIn: 'root',
    factory: (): string => inject(APP_CONFIG).authenticationUrl,
});

export const SETTINGS_API_URL = new InjectionToken<string>('SETTINGS_API_URL', {
    providedIn: 'root',
    factory: (): string => inject(APP_CONFIG).settingUrl,
});

export const FILE_API_URL = new InjectionToken<string>('FILE_API_URL', {
    providedIn: 'root',
    factory: (): string => inject(APP_CONFIG).fileUrl,
});
