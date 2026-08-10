# Mémo d'investigation — inventaire des données personnelles collectées

**Statut : inventaire factuel des champs, aucune politique de rétention ni
de conformité proposée. Décision réservée à un humain.**

Date : 2026-08-10. Méthode : lecture directe des fichiers `*.props.ts` et
`*.entity.ts` dans `libs/*/domain/src/lib/`, pas une recherche par mots-clés
seule — chaque champ listé a été vérifié dans le fichier source cité.

## 1. Les 4 modules "workflow" (report-states, requests, processing,
finalization) partagent exactement la même forme de données personnelles

`ReportStatesDetailsProps`, `RequestsDetailsProps`, `ProcessingDetailsProps`
et `FinalizationDetailsProps` (un fichier par module, voir chemins ci-dessous)
sont structurellement identiques sur la partie personnelle — seuls les
champs de state-machine (`qualificationState`, `processingState`,
`finalizationState`) diffèrent d'un module à l'autre.

| Champ                                  | Type / entité                | Nature                                                        |
| --------------------------------------- | ----------------------------- | -------------------------------------------------------------- |
| `initiatorPhone`                       | `string`                     | Numéro de téléphone de la personne à l'origine du signalement |
| `initiator`                            | `ActorEntity \| null`         | Identité (voir §1.1) de l'initiateur                          |
| `acknowledgedBy`/`processedBy`/`finalizedBy`/`approvedBy`/`rejectedBy`/`confirmedBy`/`abandonedBy` | `ActorEntity \| null` (×7) | Identité de l'agent interne ayant exécuté chaque action |
| `location`                             | `ReportLocationEntity`       | Coordonnées GPS + description du lieu (voir §1.2)             |
| `media` (`placePhoto`/`accessPlacePhoto`) | `ReportMediaEntity \| null` | Photo du lieu (peut montrer des personnes ou un domicile)     |
| `description`                          | `string`                     | Texte libre saisi par l'initiateur (peut contenir du contenu personnel non structuré) |
| `placeDescription`                     | `string`                     | Texte libre décrivant le lieu                                 |

Fichiers sources exacts :
- `libs/report-states/domain/src/lib/props/report-states-details.props.ts`
- `libs/requests/domain/src/lib/props/requests-details.props.ts`
- `libs/processing/domain/src/lib/props/processing-details.props.ts`
- `libs/finalization/domain/src/lib/props/finalization-details.props.ts`

### 1.1 `ActorEntity` (`libs/shared/domain/src/lib/entities/actor.entity.ts`,
props : `libs/shared/domain/src/lib/props/actor.props.ts`)

```typescript
export interface ActorProps {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly phone: string;
    readonly email: string;
}
```

Utilisée pour **8 rôles différents** par fiche `details` (initiateur + 7
agents internes ayant traité la fiche à une étape ou une autre) dans
chacun des 4 modules ci-dessus — soit potentiellement 8 identités
(nom, prénom, téléphone, email) par fiche.

### 1.2 `ReportLocationEntity` (`libs/shared/domain/src/lib/entities/report-location.entity.ts`,
coordonnées : `libs/shared/domain/src/lib/props/coordinates.props.ts`)

```typescript
export interface CoordinatesProps {
    latitude: number;
    longitude: number;
    what3words?: string;
}
```

`ReportLocationEntity` combine ces coordonnées avec `method`
(`LocationMethod`), `type` (`LocationType`), `name` et `description` —
c'est une donnée de géolocalisation précise (latitude/longitude, plus
`what3words` optionnel), potentiellement la position du domicile ou du
lieu de vie de l'initiateur selon le contexte du signalement.

## 2. Module `administrative-boundary` — aucune donnée personnelle trouvée

Vérifié sur les 3 entités principales
(`libs/administrative-boundary/domain/src/lib/props/{region,department,municipality}.props.ts`) :
tous les champs sont des données de référence géographique agrégées
(`name`, `code`, `populationSize`, `infrastructureCount`, `status`,
`region`/`department: { id, name }`) — aucun champ ne se rapporte à une
personne physique identifiable. **Ce module ne collecte pas de données
personnelles au sens des 3 autres.**

## 3. Champs supplémentaires trouvés hors du périmètre minimal demandé

L'inventaire ci-dessous dépasse les 5 modules requis par l'instruction
d'origine — trouvé en élargissant la même méthode de lecture directe à
d'autres modules dont le nom suggérait la présence de données personnelles
(authentification, gestion des comptes). Inclus ici pour l'exhaustivité de
l'audit, mais peut être ignoré si hors du périmètre voulu par le
lecteur humain.

### `authentication` — session utilisateur (`CurrentUser`)

`libs/shared/domain/src/lib/interfaces/current-user.interface.ts` (consommé
par `libs/authentication/domain/src/lib/props/login.props.ts`) :

```typescript
export interface CurrentUser {
    id: number;
    lastName: string;
    firstName: string;
    email: string;
    profile: string;
    phone: string;
    isAdmin: boolean;
    enable2fa: boolean;
    status: string;
    photo: string;
    permissions: UserPermission[];
    paths: string[];
    actions: Record<string, string[]> | null;
}
```

Identité complète (nom, prénom, email, téléphone, photo) de l'utilisateur
de l'application (agent interne), pas d'un usager externe.

### `settings-security` — comptes utilisateurs et journal de connexion

`libs/settings-security/domain/src/lib/props/users.props.ts` :

```typescript
export interface UsersProps {
    uniqId: string;
    lastName: string;
    firstName: string;
    email: string;
    phone: string;
    profile: string;
    role: Role | null;
    status: UsersStatus;
    updatedAt: string;
}
```

`libs/settings-security/domain/src/lib/props/access-logs.props.ts` :

```typescript
export interface AccessLogsProps {
    uniqId: string;
    action: AccessLogsAction;
    source: string;
    userAgent: string;
    createdAt: string;
}
```

`source` et `userAgent` sont un journal de connexion par utilisateur
(commentaire du fichier : « journal d'authentification personnel »). La
nature exacte de `source` (adresse IP, identifiant d'appareil, ou autre)
**n'a pas été confirmée** — le DTO source
(`libs/settings-security/data/src/lib/dtos/access-logs-response-api.dto.ts`)
nomme simplement le champ wire `source: string`, sans plus de précision.

### `team-organization` — participants

`libs/team-organization/domain/src/lib/props/participants.props.ts` :

```typescript
export interface ParticipantsProps {
    uniqId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: Role | null;
    team: string | null;
    status: ParticipantsStatus;
    updatedAt: string;
}
```

Même forme d'identité que `UsersProps` (agents internes, membres d'équipe).

## 4. Ce que ce mémo ne fait pas

Pas de proposition de durée de rétention, de base légale, de minimisation
des champs, ni de classification RGPD/loi locale applicable — ces
décisions reviennent à un humain avec autorité pour les prendre. Ce
document ne fait qu'établir, avec chemin de fichier exact, la liste des
champs actuellement collectés qui constituent une donnée personnelle.
