import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import {
    DownloadReportStatesStatus,
    DownloadReportStatesType,
} from '@cmz/report-states-domain';
import { DownloadReportStatesItemMapper } from './download-report-states-item.mapper';
import { DownloadReportStatesStatusMapper } from './download-report-states-status.mapper';
import { DownloadReportStatesTypeMapper } from './download-report-states-type.mapper';
import type { DownloadReportStatesItemApiDto } from '../dtos/download-report-states-response-api.dto';

/**
 * Backlog #11 (cartographie, 2026-08-04) — module `report-states`, 5/6
 * fichiers. Seul mapper-item du module à utiliser `id` (pas `uniq_id`)
 * comme champ requis, et 2 mappers LOCAUX au module (pas partagés) :
 * `DownloadReportStatesStatusMapper`/`-TypeMapper`. Divergence réelle vs
 * les mappers partagés (`ReportTypeMapper` etc.) : un lookup par `Record`
 * qui renvoie silencieusement `undefined` sur une clé inconnue, PAS une
 * exception `ApiError.invalidResponse` — vérifié explicitement pour ne pas
 * supposer à tort la même garde partout dans le module.
 */
function makePaginatedResponse(
    items: DownloadReportStatesItemApiDto[]
): PaginatedResponseDto<DownloadReportStatesItemApiDto> {
    return {
        error: false,
        message: 'OK',
        data: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: items.length,
            from: 1,
            to: items.length,
            first_page_url: '',
            last_page_url: '',
            next_page_url: '',
            prev_page_url: '',
            path: '',
            links: [],
            data: items,
        },
    };
}

function makeItemDto(
    partial: Partial<DownloadReportStatesItemApiDto> = {}
): DownloadReportStatesItemApiDto {
    return {
        id: 'DL-001',
        download_url: 'https://cdn.example.com/export.xlsx',
        file_name: 'export.xlsx',
        file_size: 20480,
        format: 'excel',
        status: 'done',
        filters: [{ key_label: 'Région', value_label: 'Dakar' }],
        created_at: '2026-07-01T10:00:00Z',
        ...partial,
    };
}

function createMapper(): DownloadReportStatesItemMapper {
    const injector = createEnvironmentInjector(
        [
            DownloadReportStatesStatusMapper,
            DownloadReportStatesTypeMapper,
            DownloadReportStatesItemMapper,
        ],
        null as never
    );
    return injector.get(DownloadReportStatesItemMapper);
}

describe('DownloadReportStatesItemMapper', () => {
    it('mappe le wire vers DownloadReportStatesEntity, filters renommés key_label/value_label → name/value', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('DL-001');
        expect(entity.url).toBe('https://cdn.example.com/export.xlsx');
        expect(entity.name).toBe('export.xlsx');
        expect(entity.size).toBe(20480);
        expect(entity.type).toBe(DownloadReportStatesType.EXCEL);
        expect(entity.status).toBe(DownloadReportStatesStatus.DONE);
        expect(entity.filters).toEqual([{ name: 'Région', value: 'Dakar' }]);
    });

    it('type shapefile → DownloadReportStatesType.SHAPE', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ format: 'shapefile' })])
        ).items[0];
        expect(entity.type).toBe(DownloadReportStatesType.SHAPE);
    });

    it("format wire inconnu renvoie undefined SILENCIEUSEMENT (lookup Record, pas d'exception, contrairement aux mappers partagés ReportTypeMapper/TelecomOperatorMapper)", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ format: 'pdf' as never })])
        ).items[0];
        expect(entity.type).toBeUndefined();
    });

    it('filters: tableau vide si absent du wire (pas d’exception)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ filters: undefined as never }),
            ])
        ).items[0];
        expect(entity.filters).toEqual([]);
    });

    it("url/name/size valent respectivement '', '', 0 quand absents du wire (défense ?? malgré le typage non-optionnel)", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({
                    download_url: undefined as never,
                    file_name: undefined as never,
                    file_size: undefined as never,
                }),
            ])
        ).items[0];
        expect(entity.url).toBe('');
        expect(entity.name).toBe('');
        expect(entity.size).toBe(0);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});
