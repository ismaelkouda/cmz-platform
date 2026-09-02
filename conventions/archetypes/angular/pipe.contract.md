# Contrat d'archétype — `pipe` (ui)

## Rôle

Transformation **présentationnelle** appelée dans un template
(`{{ value | maPipe }}`). Purement UI : formatage, adaptation d'affichage.

## Couche

`ui` → `@cmz/shared-ui` (ou `@cmz/<module>-ui`).

## Règle mécanique

- **Une `class` exportée** `<Nom>Pipe implements PipeTransform`, décorée `@Pipe`
  (le décorateur **n'est pas** renommé en v22, contrairement à `@Injectable`).
- **`standalone` implicite** — ne jamais écrire `standalone: true`
  ([profil Angular 22](../../angular-22.profile.json)).
- `name` en `camelCase`, **sans** le suffixe `Pipe` (`separatorThousands`, pas
  `separatorThousandsPipe`).
- `transform()` **typée** (aucun `any`) et **pure** (pas d'effet de bord).
- Dépendances par `inject()` (ex. `DomSanitizer`).

## Exemplaire

```ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'capitalize' })
export class CapitalizePipe implements PipeTransform {
    transform(value: string): string {
        if (!value) {
            return value;
        }
        return value.replace(/\b\w/g, (char) => char.toUpperCase());
    }
}
```

## Prompt

> Produis `<Nom>Pipe implements PipeTransform` décorée
> `@Pipe({ name: '<camelCase>' })` (jamais `standalone: true`), `transform()`
> typée et pure, `inject()` pour les dépendances. Nom sans suffixe `Pipe`.

**Données** : la transformation d'affichage du pipe source.
