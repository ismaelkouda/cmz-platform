# Contrat d'archétype — `constant`

## Rôle

**Donnée figée** transverse : table de valeurs (liste d'options `{value,label}`,
config par défaut) partagée entre modules. Le contenu **est** la valeur — c'est
une donnée fournie, pas un patron de code.

## Couche

`constants` → **`@cmz/shared-constants`** (feuille du DAG, aucune dépendance).
Consommée par `data`/`ui`/`application`. Les constantes **présentationnelles**
(styles de badge, logos, dimensions d'image, params de modale) ne vont pas ici :
elles relèvent de `ui`.

## Règle mécanique

- **Un `const … as const` exporté** (fige les littéraux), typage dérivé si
  utile.
- Aucune dépendance framework/DOM/`data`. Aucune logique.
- Nom de fichier `<nom>.constant.ts` (jamais le typo source `.contant.ts`).
- Un fichier = une constante.

## Exemplaire

```ts
export const SOURCE_CONST = [
    { value: 'app', label: 'COMMON.APP' },
    { value: 'ussd', label: 'COMMON.USSD' },
] as const;
```

## Prompt

> Produis un `export const <NOM>_CONST = … as const;` reprenant **exactement**
> les valeurs fournies. Aucune dépendance, aucune logique. Fichier
> `.constant.ts`.

**Données** : la table de valeurs du source.
