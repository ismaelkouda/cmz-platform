import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { TableSelectionService } from './table-selection.service';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé, ~6 appelants (tables avec
 * sélection multi-lignes). Logique de gestion de `Set` en signal, seule
 * dépendance externe est `DestroyRef` (injectable sans DOM).
 */
interface Item {
    uniqId: string;
}

function createService(): TableSelectionService<Item> {
    const injector = createEnvironmentInjector(
        [TableSelectionService],
        null as never
    );
    return injector.get(TableSelectionService) as TableSelectionService<Item>;
}

describe('TableSelectionService', () => {
    it('démarre sans sélection', () => {
        const service = createService();
        expect(service.selectedCount()).toBe(0);
        expect(service.hasSelection()).toBe(false);
        expect(service.isAllSelected()).toBe(false);
    });

    it('toggleItemSelection() ajoute puis retire un item de la sélection', () => {
        const service = createService();
        service.setAvailableItems([{ uniqId: 'a' }, { uniqId: 'b' }]);

        service.toggleItemSelection({ uniqId: 'a' });
        expect(service.isItemSelected({ uniqId: 'a' })).toBe(true);
        expect(service.selectedCount()).toBe(1);

        service.toggleItemSelection({ uniqId: 'a' });
        expect(service.isItemSelected({ uniqId: 'a' })).toBe(false);
        expect(service.selectedCount()).toBe(0);
    });

    it('isAllSelected() est vrai seulement quand tous les items disponibles sont sélectionnés', () => {
        const service = createService();
        service.setAvailableItems([{ uniqId: 'a' }, { uniqId: 'b' }]);
        service.toggleItemSelection({ uniqId: 'a' });

        expect(service.isAllSelected()).toBe(false);
        expect(service.isPartialSelected()).toBe(true);

        service.toggleItemSelection({ uniqId: 'b' });
        expect(service.isAllSelected()).toBe(true);
        expect(service.isPartialSelected()).toBe(false);
    });

    it('toggleSelectAll() bascule entre tout sélectionner et tout désélectionner', () => {
        const service = createService();
        service.setAvailableItems([{ uniqId: 'a' }, { uniqId: 'b' }]);

        service.toggleSelectAll();
        expect(service.selectedCount()).toBe(2);

        service.toggleSelectAll();
        expect(service.selectedCount()).toBe(0);
    });

    it('selectFirstNItems() sélectionne les N premiers items disponibles', () => {
        const service = createService();
        service.setAvailableItems([
            { uniqId: 'a' },
            { uniqId: 'b' },
            { uniqId: 'c' },
        ]);

        service.selectFirstNItems(2);

        expect(service.selectedCount()).toBe(2);
        expect(service.isItemSelected({ uniqId: 'a' })).toBe(true);
        expect(service.isItemSelected({ uniqId: 'b' })).toBe(true);
        expect(service.isItemSelected({ uniqId: 'c' })).toBe(false);
    });

    it('selectFirstNItems() borne le compte au nombre d’items disponibles', () => {
        const service = createService();
        service.setAvailableItems([{ uniqId: 'a' }]);

        service.selectFirstNItems(100);

        expect(service.selectedCount()).toBe(1);
    });

    it('selectFirstNItems() vide la sélection si count <= 0', () => {
        const service = createService();
        service.setAvailableItems([{ uniqId: 'a' }]);
        service.toggleItemSelection({ uniqId: 'a' });

        service.selectFirstNItems(0);

        expect(service.selectedCount()).toBe(0);
    });

    it('clearSelection() vide la sélection', () => {
        const service = createService();
        service.setAvailableItems([{ uniqId: 'a' }]);
        service.toggleItemSelection({ uniqId: 'a' });

        service.clearSelection();

        expect(service.selectedCount()).toBe(0);
    });

    it('selectedItems() ne retourne que les items dont l’id est dans la sélection', () => {
        const service = createService();
        const items = [{ uniqId: 'a' }, { uniqId: 'b' }, { uniqId: 'c' }];
        service.setAvailableItems(items);
        service.toggleItemSelection(items[1]);

        expect(service.selectedItems()).toEqual([{ uniqId: 'b' }]);
    });

    it('selectionChange$ émet un événement avec la source et la sélection précédente à chaque changement effectif', () => {
        const service = createService();
        service.setAvailableItems([{ uniqId: 'a' }]);
        const handler = vi.fn();
        service.selectionChange$.subscribe(handler);

        service.toggleItemSelection({ uniqId: 'a' });

        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({
                selectedIds: ['a'],
                selectionCount: 1,
                selectionSource: 'checkbox',
                previousSelection: [],
            })
        );
    });

    it('selectionChange$ n’émet pas si la nouvelle sélection est strictement identique (déduplication)', () => {
        const service = createService();
        service.setAvailableItems([{ uniqId: 'a' }]);
        const handler = vi.fn();
        service.selectionChange$.subscribe(handler);

        // clearSelection() sur une sélection déjà vide : aucun changement réel.
        service.clearSelection();

        expect(handler).not.toHaveBeenCalled();
    });
});
