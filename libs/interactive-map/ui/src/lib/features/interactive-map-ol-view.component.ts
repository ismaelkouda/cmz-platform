import {
    AfterViewInit,
    Component,
    DestroyRef,
    ElementRef,
    effect,
    inject,
    input,
    viewChild,
} from '@angular/core';
import { InteractiveMapReportEntity } from '@cmz/interactive-map-domain';

/** Carte OpenLayers lazy-loadée — signalements géolocalisés (SIG v1). */
@Component({
    selector: 'cmz-interactive-map-ol-view',
    styles: `
        :host {
            display: block;
            min-height: 500px;
        }

        .map-host {
            width: 100%;
            height: 500px;
            border-radius: 0.75rem;
            overflow: hidden;
            border: 1px solid var(--cmz-border, #334155);
        }
    `,
    template: `<div
        #mapHost
        class="map-host"
        role="img"
        aria-label="Carte SIG"
    ></div>`,
})
export class InteractiveMapOlViewComponent implements AfterViewInit {
    readonly reports = input<InteractiveMapReportEntity[]>([]);

    private readonly mapHost =
        viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
    private readonly destroyRef = inject(DestroyRef);

    private mapInstance: import('ol/Map').default | null = null;
    private vectorSource: import('ol/source/Vector').default | null = null;
    private mapReady = false;

    constructor() {
        effect(() => {
            if (this.mapReady && this.vectorSource) {
                this.syncReports(this.reports());
            }
        });
    }

    async ngAfterViewInit(): Promise<void> {
        const [
            { default: Map },
            { default: View },
            { default: TileLayer },
            { default: OSM },
            { default: VectorLayer },
            { default: VectorSource },
            { default: Feature },
            { default: Point },
            { fromLonLat },
        ] = await Promise.all([
            import('ol/Map'),
            import('ol/View'),
            import('ol/layer/Tile'),
            import('ol/source/OSM'),
            import('ol/layer/Vector'),
            import('ol/source/Vector'),
            import('ol/Feature'),
            import('ol/geom/Point'),
            import('ol/proj'),
        ]);

        this.vectorSource = new VectorSource();
        this.mapInstance = new Map({
            target: this.mapHost().nativeElement,
            layers: [
                new TileLayer({ source: new OSM() }),
                new VectorLayer({ source: this.vectorSource }),
            ],
            view: new View({
                center: fromLonLat([1.22, 6.13]),
                zoom: 7,
            }),
        });

        this.mapReady = true;
        this.syncReports(this.reports(), Feature, Point, fromLonLat);

        this.destroyRef.onDestroy(() => {
            this.mapInstance?.setTarget(undefined);
            this.mapInstance = null;
            this.vectorSource = null;
        });
    }

    private syncReports(
        reports: InteractiveMapReportEntity[],
        FeatureCtor?: typeof import('ol/Feature').default,
        PointCtor?: typeof import('ol/geom/Point').default,
        fromLonLatFn?: typeof import('ol/proj').fromLonLat
    ): void {
        const vectorSource = this.vectorSource;
        if (!vectorSource) {
            return;
        }

        void (async () => {
            const FeatureClass =
                FeatureCtor ?? (await import('ol/Feature')).default;
            const PointClass =
                PointCtor ?? (await import('ol/geom/Point')).default;
            const fromLonLat =
                fromLonLatFn ?? (await import('ol/proj')).fromLonLat;

            vectorSource.clear();
            for (const report of reports) {
                if (
                    !Number.isFinite(report.latitude) ||
                    !Number.isFinite(report.longitude)
                ) {
                    continue;
                }
                const feature = new FeatureClass({
                    geometry: new PointClass(
                        fromLonLat([report.longitude, report.latitude])
                    ),
                });
                feature.set('report', report);
                vectorSource.addFeature(feature);
            }
        })();
    }
}
