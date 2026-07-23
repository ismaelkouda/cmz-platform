# Contrat d'archétype — `type` (domaine)

## Rôle

**Alias de type** du domaine : union de littéraux ou type composé nommant un
concept métier (`PermissionAction`, `MediaValue`). Pas de comportement.

## Couche

`domain` → `@cmz/shared-domain`. Les types purement **UI** (contexte de route,
sélection de tableau…) relèvent de la couche `ui`, pas du domaine.

## Règle mécanique

- **Un `type` exporté** (union de littéraux ou composé), `camelCase` des membres
  quand ce sont des objets.
- Aucun décorateur, aucune classe, aucun import de `data`.
- Un fichier = un type. Suffixe `.type.ts` (jamais `.types.ts`).

## Exemplaire

```ts
export type PermissionAction =
    'read' | 'write' | 'execute' | 'export' | 'delete' | 'approve';
```

## Prompt

> Produis un `type` exporté nommant le concept fourni (union de littéraux ou
> type composé). Un seul type par fichier, suffixe `.type.ts`.

**Données** : le concept + ses variantes/champs.
