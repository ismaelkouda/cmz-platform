# ADR-0069 — L’autorisation fine appartient à l’action de page

- **Statut :** accepté
- **Date :** 2026-09-26
- **Décision :** porter les permissions fines dans chaque action approuvée, les
  compiler dans le plan de page et les faire respecter par la composition avant
  tout appel réseau

## Contexte

La page C5 `/settings-security/users` doit rester accessible à tout opérateur
authentifié capable de lire les utilisateurs. La création est plus restrictive :
le comportement historique observé contrôle l’action `create` sur cette route.

Ajouter `users.create` à l’accès de page aurait interdit aussi la lecture aux
opérateurs sans droit de création. L’ajouter uniquement dans le futur bouton
aurait laissé la méthode `submit` appelable. Enfin, le contrat HTTP observé ne
prouve qu’une authentification Bearer ; le présenter comme une preuve
d’autorisation aurait inventé une garantie backend.

## Décision

### 1. Contrat explicite par action

Chaque action d’`application-design` déclare désormais une autorisation :

- `mode: none` lorsqu’aucune permission fine n’est demandée ;
- `mode: required` avec une liste non vide et unique de permissions, un
  comportement visuel `disable|hide` et une preuve métier traçable.

Toutes les permissions sont requises. Le cas C5 déclare `users.create` avec
`denied_behavior: disable`, sans renforcer l’accès `authenticated` de la page.
Une action de navigation reste limitée à `none` tant qu’aucun oracle de
navigation n’exécute une permission fine.

### 2. Compilation et négociation fermées

Le `page-execution-plan` recopie une forme normalisée, trie les permissions et
retire les références de preuve qui n’appartiennent pas au runtime. Une action
protégée exige la capability `action.authorization.permissions-all@1`. Le
validateur rejette une permission dupliquée, une preuve inconnue, une capability
absente ou incohérente et toute forme d’autorisation non supportée.

### 3. Garde Angular au point d’exécution

La composition générée expose un port hôte minimal
`PageActionPermissionPort.has(permission): Signal<boolean>`, ainsi que :

- `authorized`, calculé depuis les signaux courants ;
- `deniedBehavior`, destiné à la future réalisation visuelle ;
- `PageActionPermissionDeniedError`, stable et inspectable ;
- un contrôle différé à chaque souscription de `submit`.

Si une permission manque, la composition échoue avant d’appeler la façade :
aucun POST, aucune invalidation et aucun changement d’état de la commande. Une
invocation directe ne peut donc pas contourner le futur bouton désactivé. Le
provider hôte reste obligatoire ; son absence fait échouer l’injection au lieu
d’accorder implicitement l’accès.

### 4. Frontière de sécurité

Cette garde améliore l’UX et ferme les appels accidentels dans le client, mais
elle ne constitue pas l’autorité de sécurité. Le backend doit toujours vérifier
l’identité et la permission réelle. Le dépôt ne crée donc ni moteur RBAC, ni
store global, ni transport, ni dépendance, et ne modifie pas le contrat HTTP
observé pour lui attribuer une garantie non prouvée.

## Preuves

- validation positive et mutations négatives du design et du plan ;
- propagation exacte de `users.create` dans l’application C5 publiée ;
- négociation explicite de la capability Angular ;
- oracle Angular natif : permission refusée, erreur typée, état `idle`, zéro
  GET/POST ;
- non-régression des succès, erreurs, doubles soumissions et invalidations
  existants ;
- recompilation octet par octet des artefacts C5 publiés.

## Conséquences

- lecture de page et droit de mutation ne sont plus confondus ;
- toute cible doit fournir explicitement la capability avant de consommer le
  plan ;
- la future UI n’a pas à réinventer la permission, mais doit encore raccorder le
  port hôte et appliquer `disable` à son contrôle visible ;
- les designs existants déclarent explicitement `none`, ce qui rend les revues
  et migrations prévisibles.

## Hors périmètre

- résolution réelle des permissions depuis l’identité de production ;
- politique et enforcement du backend ;
- réalisation visuelle du bouton et du formulaire ;
- ouverture, fermeture, toast, accessibilité et régression visuelle ;
- généralisation de l’autorisation aux navigations ou à d’autres frameworks.

## Alternatives rejetées

- **permission au niveau page :** elle masque aussi la liste en lecture ;
- **contrôle uniquement dans le bouton :** un appel direct contourne l’UI ;
- **permission dans `action-request` :** la primitive transport ne connaît pas
  le contexte métier de la page ;
- **moteur RBAC partagé maintenant :** aucune preuve ne justifie ce coût ;
- **faire croire que Bearer prouve `users.create` :** le contrat backend observé
  ne le démontre pas.

## Références

- [ADR-0058](./0058-page-execution-plan-reference-les-primitives-v2.md)
- [ADR-0059](./0059-composition-angular-materialise-les-noeuds-du-plan.md)
- [ADR-0065](./0065-composition-c5-utilisateurs-sur-contrats-observes.md)
- [ADR-0068](./0068-publier-c5-dans-une-application-de-preuve.md)
