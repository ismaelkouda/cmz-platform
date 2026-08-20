# sign-in.definition.json — expliqué ligne par ligne

Ce fichier accompagne `sign-in.definition.json` (le vrai fichier, sans
commentaires, que `generate:action-request` va lire). JSON n'accepte pas les
commentaires natifs, donc les explications vivent ici, à côté, en miroir de
chaque bloc.

```json
{
  "schema_version": "1.0.0",   // toujours cette valeur, ne pas inventer
  "kind": "action-request",     // ⚠️ TON ERREUR N°1 : absent de ton fichier.
                                 // Sans "kind", le validateur ne sait pas
                                 // quel schéma appliquer. C'est ce qui
                                 // distingue une "définition" (prête à
                                 // générer) d'une "spec" (format interne
                                 // différent, utilisé par un autre outil).
```

## Bloc `feature` — identité de la fonctionnalité

```json
"feature": {
  "id": "sign-in",              // identifiant technique, kebab-case
  "name": "Sign In",            // nom lisible
  "description": "..."          // une phrase, sert de documentation générée
},
```

Ton fichier n'avait pas ce bloc du tout — il avait `"domain_id": "auth"`
directement à la racine. C'est le format de l'autre outil (l'adaptateur de
spécification structurée), pas celui-ci.

## `opaque_types` — déclarer les types composés référencés ailleurs

```json
"opaque_types": [
  {
    "id": "current-user",
    "description": "Authenticated user profile returned after sign-in."
  },
  {
    "id": "authentication-token",
    "description": "Bearer token used to authorize subsequent requests."
  }
],
```

Laisse `[]` si tu n'as que des primitives (`string`, `integer`, `uuid`...). Mais
dès qu'une opération a l'effet `establish_session` (voir plus bas), le renderer
Angular génère un
`SessionPort.persist(user: CurrentUser, token: AuthenticationToken)` **codé en
dur** avec exactement ces deux noms. Il faut donc déclarer ici deux
`opaque_types` avec `id: "current-user"` et `id: "authentication-token"`, puis
les référencer dans `output.fields` avec `type.kind: "model"` (voir plus bas) —
sinon la génération échoue à la compilation TypeScript avec
`Module has no exported member 'CurrentUser'`. Chaque `opaque_type` a besoin
d'un `id` et d'une `description`, rien de plus (pas de champs internes — c'est
un type "boîte noire" pour le moteur, à raccorder plus tard côté produit).

## `operations` — un tableau, un objet par opération

```json
"operations": [
  {
    "id": "sign-in",
    "description": "Exchange credentials for an authenticated session.",
```

## `input.fields` — ce que l'utilisateur saisit

```json
"input": {
  "description": "Credentials submitted by the user.",
  "fields": [
    {
      "name": "email",
      "type": {
        "kind": "primitive",    // "primitive" pour un champ simple (chaîne,
        "name": "string",       // nombre, booléen, uuid, date, datetime...) ;
        "nullable": false       // "model" pour référencer un opaque_type
      },                        // déclaré plus haut (voir output.fields)
      "required": true,
      "format": "email"        // contrainte de format optionnelle
    },
    {
      "name": "password",
      "type": { "kind": "primitive", "name": "string", "nullable": false },
      "required": true
      // pas de "format" ici : rien ne t'oblige à en mettre un
    }
  ]
},
```

## `output.fields` — ce que le backend renvoie en cas de succès

```json
"output": {
  "id": "sign-in-result",       // ⚠️ TON ERREUR N°3 : absent chez toi.
                                 // "output" a besoin de son propre "id",
                                 // comme "input" a besoin d'un "id" de
                                 // feature. C'est ce qui nomme le type
                                 // TypeScript généré (ex. SignInResult).
  "description": "...",
  "fields": [
    {
      "name": "user",
      "type": { "kind": "model", "name": "current-user", "nullable": false },
      "required": true
    },
    {
      "name": "token",
      "type": {
        "kind": "model",
        "name": "authentication-token",
        "nullable": false
      },
      "required": true
    }
  ]
},
```

`user`/`token` référencent ici les deux `opaque_types` déclarés en haut du
fichier (`type.kind: "model"`, `type.name` = l'`id` de l'opaque_type). C'est le
lien entre le bloc `opaque_types` et ce bloc `output` — sans ce lien, le
renderer génère un import (`CurrentUser`, `AuthenticationToken`) vers un type
qui n'existe nulle part, et la compilation échoue.

## `access` — qui peut appeler cette opération

```json
"access": { "mode": "public" },
```

⚠️ TON ERREUR N°4 : tu avais écrit `"access": "public"` — une simple chaîne. Le
schéma attend un **objet** avec la clé `mode`. Les trois valeurs valides de
`mode` sont `"public"`, `"authenticated"`, `"authorized"` (cette dernière exige
en plus `"permissions": [...]`, non vide).

## `http` — l'appel réseau réel

```json
"http": {
  "method": "POST",
  "path": "sign-in",
  "authentication": "none"      // "none" ou "bearer", pas de session à
                                 // envoyer puisque c'est justement cet appel
                                 // qui va en créer une
},
```

Celui-ci était déjà correct chez toi.

## `effects` — un tableau d'objets, pas un tableau de chaînes

```json
"effects": [
  {
    "kind": "external_call",              // requis structurellement
    "description": "Submit the credentials to the authentication boundary."
  },
  {
    "kind": "establish_session",          // mot réservé, vrai comportement :
    "description": "Persist the returned user and token as the active session."
    // force la sortie à contenir "user" + "token" et déclenche la
    // persistance de session dans le code généré
  }
]
```

⚠️ TON ERREUR N°5 : tu avais écrit
`"effects": ["external_call", "establish_session"]` — un tableau de simples
chaînes. Le schéma attend un tableau d'**objets**, chacun avec `kind` +
`description`.

---

## Résumé des écarts trouvés dans ta première tentative

1. `kind: "action-request"` absent à la racine — sans lui, ce n'est pas le bon
   format de fichier pour cette commande.
2. `output.id` (ex. `"sign-in-result"`) manquant.
3. `access` doit être un objet `{ "mode": "..." }`, pas une chaîne nue.
4. Chaque entrée d'`effects` doit être un objet `{ kind, description }`, pas une
   simple chaîne.
5. Les `opaque_types` (`current-user`, `authentication-token`) étaient
   référencés en `output` (`type.kind: "model"`) mais jamais déclarés dans le
   bloc `opaque_types` en tête de fichier. Ta première intuition d'utiliser
   `"kind": "model"` était en fait la bonne — mon premier essai de correction
   l'avait remplacé par des primitives `string`, ce qui compilait le JSON mais
   faisait échouer la génération TypeScript
   (`Module has no exported member 'CurrentUser'`), parce que le renderer
   Angular génère toujours ces deux noms précis dès qu'une opération a l'effet
   `establish_session`, qu'ils soient déclarés ou non. Corrigé en ajoutant les
   deux `opaque_types` manquants — génération vérifiée fonctionnelle (Angular +
   ReactJS, `bun run generate:action-request`).

## Lancer la génération

```bash
bun run generate:action-request \
  --definition tools/generator-platform/sources/sign-in.definition.json \
  --out /tmp/generated-sign-in \
  --target all
```
