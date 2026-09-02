# Contrat d'archétype — `function` (domaine)

## Rôle

Opération **pure** du domaine : une fonction exportée, sans état, sans effet de
bord, sans dépendance framework. Ce qui tient en une fonction n'a pas besoin
d'être une classe/service.

## Couche

`domain` → `@cmz/shared-domain` (ou `@cmz/<module>-domain`).

## Règle mécanique

- **Une `function` exportée** nommée, entrées/sorties **typées** (aucun `any`).
- Pure : même entrée → même sortie, aucun accès I/O, DOM, réseau, storage.
- Aucun décorateur, aucun import de `data`/UI.
- Un fichier = une fonction.

## Exemplaire

```ts
export function normalizePhoneNumber(phone?: string): string | undefined {
    if (!phone) {
        return undefined;
    }
    return phone.replaceAll(/\D/g, '');
}
```

## Prompt

> Produis une `function` exportée, typée, **pure** (aucun effet de bord ni I/O),
> réalisant l'opération fournie. Aucun décorateur, aucun import de DTO/UI.

**Données** : signature attendue + logique de l'opération.
