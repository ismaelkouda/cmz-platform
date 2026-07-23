export type SelectionSource = 'checkbox' | 'input' | 'clear' | 'initial';

export interface SelectionEvent<T> {
    selectedItems: T[];
    selectedIds: string[];
    selectionCount: number;
    selectionSource: SelectionSource;
    previousSelection: string[];
}
