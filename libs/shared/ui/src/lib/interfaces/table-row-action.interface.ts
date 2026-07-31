/** Déclaration d'une action bouton de ligne (`__action`). */
export interface TableRowActionDefinition {
    id: string;
    icon: string;
}

/** État présentation d'un bouton d'action par id. */
export interface TableRowActionButtonState {
    tooltip: string;
    disabled: boolean;
}
