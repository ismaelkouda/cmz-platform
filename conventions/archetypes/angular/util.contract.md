# Contrat d'archétype — `util` (domaine)

## Rôle

Aide **pure** du domaine : petite fonction sans état ni effet de bord portant
une règle métier réutilisable (comparaison, validation booléenne, résolution
d'une valeur par défaut). Proche de `function` ; on parle d'`util` quand c'est
un helper métier transverse.

## Couche

`domain` → `@cmz/shared-domain`. **Ne pas confondre** avec les utils qui
dépendent de `HttpClient`, `moment`, `@angular/*` : ceux-là sont
`data`/`ui`/`infra` (cf.
[`docs/architecture/domain-scope.md`](../../../docs/architecture/domain-scope.md)).

## Règle mécanique

- **Une `function` exportée** typée (aucun `any`), **pure**.
- Aucun import externe (framework, lib, `data`, DOM, réseau, storage).
- Un fichier = une fonction.

## Exemplaire

```ts
export function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
```

## Prompt

> Produis une `function` util exportée, typée et **pure**, réalisant la règle
> fournie. Aucun import externe.

**Données** : la signature + la règle.
