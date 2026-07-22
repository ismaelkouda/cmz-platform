# Adaptateur monorepo SEOS

Post-traite la sortie plate d'un générateur SEOS pour la transformer en
bibliothèques Nx par couche et par module
([ADR-0011](../../docs/adr/0011-adaptation-monorepo-par-post-traitement.md)).

**On ne touche jamais aux générateurs.** Cet outil est spécifique à ce monorepo
: il encode nos choix structurels (lib par couche, scope `@cmz/*`, catalog). Les
générateurs, eux, restent en amont (dépôt tiers).

## Usage

```bash
node tools/seos-adapter/adapt.mjs <dossier-plat> <module> [--dry-run]
```

- `<dossier-plat>` : sortie d'un générateur SEOS (contient `domain/`,
  `application/`, `infrastructure/`, `presentation/`, `di/`, `*.routes.ts`).
- `<module>` : nom court du module → `libs/<module>/…` et `@cmz/<module>-…`.
- `--dry-run` : rapport sans écriture.

## Pipeline complet (une entité)

⚠️ **Le dossier de génération doit porter le nom du module.** Le générateur
nomme les fichiers de niveau module d'après le `basename` du dossier de sortie,
et `check-pattern` en déduit le même nom : générer dans `/tmp/gen` créerait un
module « gen » et ferait échouer la vérification (3 fichiers « manquants »).

```bash
export SEOS=/chemin/vers/cmz-backoffice-frontend/seos
MOD=seos-reference

rm -rf /tmp/$MOD
node "$SEOS/tools/generate-reference-module.js" /tmp/$MOD       # génère (plat)
node "$SEOS/tools/check-pattern.js" /tmp/$MOD resources         # 106/106 AVANT distribution
node tools/seos-adapter/adapt.mjs /tmp/$MOD "$MOD"             # distribue + réécrit + émet
bun install                                                     # résout les workspace:*
bunx nx show projects --json | tr ',' '\n' | grep "$MOD"      # 5 libs reconnues
```

> `--json` est requis : `nx show projects` sans lui plante sur ce build
> (`isAiAgent is not a function`, Nx 23.1.0). Le `--json` évite ce chemin de
> code.

`check-pattern` s'exécute **avant** l'adaptation : il valide le pattern sur la
sortie plate, pas la disposition monorepo.

## Ce que fait l'adaptateur

1. **Distribue** les dossiers de couche dans `libs/<module>/<lib>/src/lib/…`
   (table couche → lib dans `mapping.mjs`).
2. **Réécrit les imports**, en tenant compte de la couche du fichier courant :
    - même module + même couche → import **relatif** (reste dans la lib) ;
    - même module + autre couche → barrel `@cmz/<m>-<couche>` ;
    - noyau `@shared/*` / `@core/*` → `@cmz/shared-*` / `@cmz/core` ;
    - externe (`@angular`, `rxjs`…) → inchangé.
3. **Émet par lib** : `package.json` (deps internes `workspace:*`, socle
   `catalog:`), `project.json` (tags Nx), `src/index.ts` (barrel),
   `tsconfig.json`.
4. **Enregistre** les _paths_ TypeScript des libs dans `tsconfig.base.json`
   (comme `nx g lib`), pour que `@cmz/<m>-*` résolve.

## Étendre pour un nouveau pattern

Rien à changer dans l'adaptateur si le pattern émet la même structure de
couches. Pour une nouvelle couche, ajouter une entrée dans `mapping.mjs`
(`LAYERS`) — pas de fork du générateur.

## Fichiers

| Fichier       | Rôle                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| `mapping.mjs` | Tables couche → lib, sous-espaces `@shared`, classification des imports |
| `adapt.mjs`   | Distribution, réécriture contextuelle, émission des libs et des paths   |

## Validé (Phase 04)

Sur le module de référence généré (`seos-reference`, 107 fichiers) :

- distribution : 107 → 5 libs, comptes conformes ;
- réécriture : 0 alias legacy résiduel ; intra-couche relatif, inter-couche
  barrel ;
- `nx show projects` reconnaît les 5 libs ;
- `tsc` : les `@cmz/<m>-*` internes résolvent ; seuls les `@cmz/shared-*`
  restent non résolus (noyau transverse, Phase 05).
