import {
    ActivatedRouteSnapshot,
    DetachedRouteHandle,
    RouteReuseStrategy,
} from '@angular/router';

/** Réutilise les composants de route marqués `data.reuseComponent === true`. */
export class CustomRouteReuseStrategy implements RouteReuseStrategy {
    private readonly storedRoutes = new Map<string, DetachedRouteHandle>();

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        return route.data?.['reuseComponent'] === true;
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
        const id = this.getRouteId(route);
        if (id) {
            this.storedRoutes.set(id, handle);
        }
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        const id = this.getRouteId(route);
        return !!id && !!this.storedRoutes.get(id);
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
        const id = this.getRouteId(route);
        return id ? (this.storedRoutes.get(id) ?? null) : null;
    }

    shouldReuseRoute(
        future: ActivatedRouteSnapshot,
        curr: ActivatedRouteSnapshot
    ): boolean {
        return future.routeConfig === curr.routeConfig;
    }

    clearHandle(path: string): void {
        const toDelete: string[] = [];
        this.storedRoutes.forEach((_, key) => {
            if (key.includes(path)) {
                toDelete.push(key);
            }
        });
        toDelete.forEach((key) => this.storedRoutes.delete(key));
    }

    private getRouteId(route: ActivatedRouteSnapshot): string | null {
        if (!route.routeConfig) {
            return null;
        }
        let path = route.routeConfig.path ?? '';
        if (route.params && Object.keys(route.params).length > 0) {
            path +=
                '?' +
                Object.entries(route.params)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('&');
        }
        return path;
    }
}
