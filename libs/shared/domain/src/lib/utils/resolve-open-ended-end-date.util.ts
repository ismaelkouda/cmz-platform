/**
 * Règle métier partagée : quand un filtre ne fournit qu'une date de début sans
 * date de fin, on considère la plage ouverte jusqu'à aujourd'hui.
 */
export function resolveOpenEndedEndDate(
    startDate?: Date,
    endDate?: Date
): Date | undefined {
    return startDate && !endDate ? new Date() : endDate;
}
