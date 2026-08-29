# Récit — genèse d'ADR-0037 et ADR-0038

- **Créé :** 2026-08-29
- **Nature :** document narratif, pas un ADR. Il ne décide rien et ne
  supersède rien. Il raconte l'enchaînement complet des idées, critiques et
  arbitrages qui ont mené aux décisions actées dans
  [ADR-0037](../adr/0037-plateforme-intention-utilisateur-vers-application.md)
  et [ADR-0038](../adr/0038-nature-produit-public-multi-locataire.md), pour
  qu'un futur lecteur (humain ou agent) comprenne *pourquoi* le document final
  a la forme qu'il a, sans devoir rejouer la conversation qui l'a produit.
- **À lire en complément de, jamais à la place de** : ADR-0037 et ADR-0038
  restent les documents de référence pour ce qui a été décidé. Ce récit
  explique le chemin, pas le contrat.

---

## 1. Point de départ : l'ambition « n'importe quelle application »

Avant qu'ADR-0037 existe, une question plus large a été posée sur ce dépôt :
dans un monde où le codage assisté par IA est de plus en plus capable, la
plateforme de génération (`tools/generator-platform/`) apporte-t-elle une
réelle valeur, ou reproduit-elle simplement ce qu'un agent LLM compétent sait
déjà faire seul ?

L'examen a établi une distinction structurante, reprise ensuite dans toute la
suite du récit :

- **Ce qui a une valeur indépendante de la qualité du LLM** : déterminisme,
  non-régression, propriété d'artefacts (ADR-0033), auditabilité par hash de
  provenance. Un LLM, aussi bon soit-il, ne rend pas ces propriétés
  optionnelles — elles sont structurelles.
- **Ce qui est réellement prouvé aujourd'hui** : la matrice de capacités
  (`docs/architecture/generation-platform-capability-matrix.md`) montre que le
  claim « plateforme générique dans l'enveloppe initiale » a été promu **M4**
  le 2026-08-18, avec audit indépendant par un second agent qui a rejoué les
  tests plutôt que de faire confiance aux résumés — un vrai niveau de rigueur,
  pas une déclaration d'intention.
- **Ce qui reste non prouvé** : cette enveloppe exclut explicitement, §2 de la
  matrice, la « génération universelle de tout logiciel ». Tout ce qui
  testerait la généricité au-delà de CRUD/commande/workflow reste M0–M1 :
  OpenAPI (adaptateur vide), Figma (conception seule), texte libre (M0), 3ᵉ
  stack (POC interrompu). Les derniers chantiers réels avant cette
  conversation (PLAT-5G→5K) ont tous durci la tranche déjà prouvée
  (`action-request`/`workflow-action` sur Angular/React), pas étendu la
  couverture.

**Conclusion retenue à ce stade** : la rigueur du dépôt est réelle et
vérifiée, mais l'ambition « any application » a été, dans les faits, retirée
du terrain de mesure — et l'énergie récente est allée renforcer ce qui est
déjà le plus proche de ce qu'un agent LLM sait déjà bien faire seul, pas vers
ce qui différencierait réellement la plateforme. C'est ce constat qui motive,
plus bas, la critique de séquencement (R1) opposée à ADR-0037.

## 2. Le choix du cas pratique : OpenAPI, puis la bifurcation

Pour transformer cette analyse en action, le choix s'est porté sur le gap le
plus concret et le mieux borné du §3 de la matrice : finir
`tools/generator-platform/adapters/openapi-adapter.mjs`, alors vide (0
octet), pour en faire une 3ᵉ source qui converge vers la même IR canonique
que `legacy-typescript-adapter.mjs` et `structured-spec-adapter.mjs` sur le
domaine `authentication` déjà prouvé (PLAT-2).

Deux détours utiles ont eu lieu avant d'écrire la moindre ligne :

1. **Découverte que `newsletter-subscribe.definition.json`** (présent, non
   committé, à l'origine du choix du cas) était dans le **mauvais format** —
   celui du pipeline riche `*.definition.json` consommé par
   `generate-action-request.mjs` (utilisé par `support-request`,
   `inventory-adjustment`), pas le format `observation` restreint que
   `validateObservation()` attend d'un adaptateur. Les deux pipelines
   coexistent dans ce dépôt et ne doivent pas être confondus.
2. **Découverte d'un précédent réel, depuis retiré** : `apps/newsletter-test`
   (Angular) et `apps/newsletter` (React SPA) avaient été créés la veille
   (commit `0c2fa76`) comme harnais pour tester en navigateur ce que le
   générateur produit pour `newsletter-subscribe` — confirmant que ce cas
   avait un antécédent concret dans ce dépôt, pas juste une intention.
   **Ces deux apps n'existent plus au moment où ce récit est relu** : elles
   ont été supprimées dans un chantier séparé (nettoyage complet
   `apps/`/`libs/`/config/docs, voir historique git sur `newsletter`),
   antérieur à la conversation qui a produit ADR-0037/0038. `apps/` ne
   contient aujourd'hui que `backoffice-angular`. Ce point 2 documente un
   fait qui a motivé le choix initial du cas pratique, pas l'état courant du
   dépôt — vérifié via `ls apps/` avant d'écrire cette note, pour ne pas
   propager une affirmation devenue fausse.

Le travail est passé en mode pair programming (« on le fait nous deux étape
par étape, j'exécute chaque commande, on repart de zéro ») avec une première
étape proposée (nettoyer les deux fichiers non committés mal formés) — puis
interrompu par la bifurcation suivante avant exécution.

## 3. La bifurcation : d'un adaptateur à une plateforme d'intention utilisateur

Une session parallèle a posé une question différente et plus ambitieuse : et
si, au lieu d'écrire soi-même un `.definition.json`, une personne non-initiée
pouvait décrire son besoin **en langage naturel**, obtenir une application,
puis la désigner par un identifiant stable pour demander des évolutions
ciblées ?

Cette session a mené une recherche externe substantielle avant de rédiger
quoi que ce soit :

- **Taxonomie spec-driven development** (Fowler/Bockeler, 2026) —
  spec-first / spec-anchored / spec-as-source ; `cmz-platform` a déjà choisi
  implicitement spec-as-source via ADR-0033.
- **Écart product agents / prototyping platforms** (rapport de marché, Q3
  2026) — les outils qui gardent une spec versionnée comme source de vérité
  (Remy) contre ceux qui régénèrent sans mémoire stable à chaque prompt
  (Lovable, Bolt, v0) ; seule la première famille permet un identifiant de
  page fiable dans la durée.
- **Identifiants stables vs. identifiants de version** (pratique CMS) — un
  identifiant statique jamais réutilisé, distinct d'un identifiant de version
  qui change à chaque publication.
- **ClarifyGPT** (arXiv:2310.10996) — détecter l'ambiguïté par désaccord
  mesurable entre plusieurs interprétations indépendantes, plutôt que par la
  confiance déclarée (peu fiable, arXiv:2604.21505) du modèle sur lui-même.
- **Édition structurée plutôt que réécriture complète** (JSON Patch,
  RFC 6902) — une opération localisée ne peut pas faire disparaître
  silencieusement une règle, contrairement à une réécriture intégrale.
- **Précédent d'abus documenté** (Proofpoint, Lovable/phishing 2025–2026) —
  preuve que le risque n'est pas hypothétique, et que les garde-fous ajoutés
  *après* l'abus sont le signal le plus utile de cette recherche : l'abus
  doit être une exigence de conception initiale, pas un correctif.

Ce travail a produit **ADR-0037 (première version)**, committé, qui posait
l'Option B : le langage naturel devient une source de premier ordre de l'IR,
avec un pipeline en quatre étapes (evidence model → désambiguïsation par
échantillonnage → validation stricte → double identifiant `page_id`/
`revision_id`) — mais formulé pour un **public non authentifié** sur une
interface publique.

## 4. Première revue critique — quatre angles morts identifiés

Sur demande explicite (« critique staff big tech rigoureux, recherche
poussée, plusieurs hypothèses, peu importe le temps »), une revue
indépendante de cette première version a été menée, avec recherche externe
complémentaire, et ajoutée au corps du document plutôt que gardée en
conversation :

- **R1 — Séquencement non justifié.** OpenAPI restait M1 avec un adaptateur
  vide sur la même feuille de route ; ADR-0037 ouvrait un chantier plus
  ambitieux sans justifier de passer devant un gap déjà ouvert et mieux
  borné — application directe du constat de la section 1 de ce récit.
- **R2 — Décision de nature de produit absente.** Le document faisait
  basculer le dépôt de « compilateur interne » à « produit public
  multi-locataire » sans jamais poser cette question comme sa propre
  décision — alors que ce dépôt avait déjà, une fois (ADR-0026), jugé qu'une
  reformulation changeant « la finalité déclarée du projet entier » ne
  pouvait pas rester enfouie ailleurs.
- **R3 — Incompatibilité avec le socle hérité.** ADR-0035 borne
  explicitement la durabilité de publication à « aucun lecteur externe
  concurrent », un seul arbre local (APFS/ext4) — incompatible avec N
  utilisateurs publics simultanés. Recherche complémentaire (Totalum, 2026) :
  même Replit Agent/v0/Bolt.new/Lovable ne résolvent pas l'isolation
  multi-locataire pour vous, elle reste à concevoir séparément.
- **R4 — Angle mort de la désambiguïsation par désaccord.** « Too Consistent
  to Detect: A Study of Self-Consistent Errors in LLMs » (arXiv:2505.17656)
  établit qu'un modèle produisant la **même** erreur à chaque échantillon
  rend les méthodes fondées sur le désaccord aveugles par construction — un
  fait qui ne diminue pas avec l'échelle du modèle. Nuance symétrique
  trouvée en complément (« Self-Consistency Falls Short! », TACL/MIT Press) :
  un désaccord peut aussi être un faux positif dû à un biais de position sur
  entrée longue.

**Verdict de cette étape** : la Décision (Option B) n'était pas remise en
cause, mais le document n'était pas encore un feu vert d'implémentation —
ces quatre conditions déplaçaient la charge de la preuve.

## 5. Contre-vérification indépendante — durcissement et correction

La session à l'origine d'ADR-0037 a ensuite mené sa propre contre-critique de
cette revue, plutôt que de l'accepter telle quelle — un contrôle croisé dans
l'esprit de l'audit indépendant déjà pratiqué ailleurs dans ce dépôt (PLAT-4bis-AR/§6
de la matrice de capacités). Résultat, point par point :

- **R1 confirmé et durci** avec des faits non exploités par la première
  revue : `docs/architecture/memo-openapi.md` existe déjà (208 lignes,
  daté 2026-08-10), 301 DTOs réels déjà recensés, `$SEOS_LEGACY_ROOT` déjà
  identifié comme source — vérifiés exacts. OpenAPI n'est pas juste
  « ouvert », c'est un chantier presque prêt à reprendre.
- **R2 confirmé** avec une preuve supplémentaire : `docs/adr/0007-configuration-runtime.md`
  (ligne 116) mentionne déjà le multi-tenant comme hypothèse jamais tranchée
  — vérifié exact. Le dépôt avait déjà, une fois, laissé cette question
  ouverte ailleurs sans jamais la reprendre.
- **R2/R3 requalifiés** : pas deux points parallèles, mais un préalable
  bloquant — sans réponse à R2, R3 n'a même pas de question à poser (si la
  réponse est « pas de multi-tenant », le socle ADR-0033/0035 suffit tel
  quel, aucune incompatibilité à lever).
- **R4 jugé insuffisant tel que recommandé.** La recommandation initiale
  (« ne jamais le présenter comme une garantie, envisager en complément »)
  a été jugée trop molle pour ce niveau d'exigence. Proposition alternative :
  un mécanisme déterministe et automatique (checklist métier fixe,
  fail-closed, dans l'esprit de `check-no-orphan-references.mjs`) plutôt
  qu'une recommandation de prudence.

## 6. Version révisée — le resserrement de portée

ADR-0037 a été intégralement réécrit (pas juste complété) pour intégrer ces
retours, avec la portée resserrée suivante, actée dans sa version actuelle :

- **Séparation en deux documents.** La question de nature de produit est
  extraite en totalité vers **ADR-0038**, dont la Décision est explicitement
  « Non tranchée » — posée pour ne pas rester résolue par le silence, sans
  prétendre y répondre.
- **Portée d'ADR-0037 réduite** à un utilisateur déjà titulaire d'un accès au
  dépôt (pas un public anonyme) : le `.definition.json` produit depuis du
  texte libre suit le même chemin qu'une pull request ordinaire — revue
  humaine avant toute compilation, à chaque génération et à chaque édition.
- **Séquencement explicite acté** : « Ce document reste donc proposé, pas
  engagé, tant qu'OpenAPI n'est pas conclu » — R1 n'est plus une simple
  remarque, c'est une condition d'entrée écrite dans le document.
- **R4, dans un premier temps, traité par la revue humaine seule** : la
  version révisée décrite ci-dessus ne retenait, à ce stade, que la revue
  humaine (étape 3 du pipeline d'alors) comme filet compensant l'angle mort
  de la désambiguïsation automatique — sans checklist déterministe distincte.

## 7. Retour utilisateur — la combinaison manquante, corrigée

Une fois cette version relue, un retour a identifié précisément ce point :
substituer la revue humaine à la checklist déterministe n'était pas une
erreur en soi (cohérent avec le périmètre resserré), mais réintroduisait
exactement la dépendance à la vigilance humaine que la checklist visait à
éliminer — et rien dans le document n'expliquait pourquoi ce choix avait
été préféré à la combinaison des deux plutôt qu'à un remplacement de l'une
par l'autre.

Ce retour a été vérifié avant correction (l'étape « checklist » était bien
absente du texte à ce moment, comme affirmé) puis intégré : le pipeline a
été étendu d'une étape supplémentaire, distincte de la revue humaine — une
checklist métier fixe, écrite une fois, appliquée mécaniquement sans appel
à un modèle de langage, avant présentation au relecteur humain — avec une
justification explicite du pourquoi les deux se combinent plutôt que l'une
ne remplace l'autre : la désambiguïsation par désaccord attrape la variance
de tirage entre échantillons du même modèle, la checklist attrape le biais
systématique qui échappe par construction à cette comparaison (un modèle
qui produit la même erreur à chaque tirage), la revue humaine attrape ce
qu'aucun mécanisme automatique ne peut formaliser d'avance. Toutes les
références numériques d'étapes du document (recherche, décision,
justification, conséquences, références) ont été renumérotées en
conséquence et vérifiées une à une par recherche textuelle pour éviter
toute référence orpheline.

## 8. Vérification finale — ce qui est tenu, ce qui ne l'est pas

Une dernière passe compare le document final aux cinq recommandations
tirées de la synthèse de la section 5, point par point, **état vérifié au
commit `ca6623a`** (le plus récent sur ADR-0037 au moment de la rédaction de
cette section) :

| # | Recommandation | Statut dans le document final |
|---|---|---|
| 1 | Trancher « produit public ou pas » en réponse fermée | **Nuance** — ADR-0038 pose la question mais la laisse « délibérément non tranchée », pas une réponse fermée « non ». Effet pratique équivalent (rien n'avance vers le public), formulation différente. |
| 2 | Réduire la portée à un utilisateur du dépôt | **Tenu**, intégralement. |
| 3 | Checklist automatique et déterministe pour compenser l'angle mort R4, en complément de la revue humaine | **Tenu** — les deux mécanismes coexistent (étapes 3 et 4 du pipeline final), avec une justification explicite de pourquoi ils se combinent plutôt que l'un ne remplace l'autre. Corrigé après le premier retour utilisateur, qui avait identifié cette lacune précise. |
| 4 | Finir OpenAPI avant ce chantier | **Tenu**, renforcé en condition d'entrée explicite. |
| 5 | Question produit public écrite à part, pas en dette acceptée | **Tenu**, extraite intégralement vers ADR-0038. |

**Aucun point ouvert connu à ce stade.** Les cinq recommandations sont
toutes tenues, avec une seule nuance assumée et documentée (point 1).

## 9. État courant et prochaine étape

À la date de ce récit :

- `tools/generator-platform/adapters/openapi-adapter.mjs` est toujours vide
  (0 octet) — le travail de la section 2 n'a pas repris.
- ADR-0037 et ADR-0038 sont committés, formulation actuelle décrite en
  sections 6-8 ci-dessus.
- La condition de séquencement posée par ADR-0037 lui-même (« proposé, pas
  engagé, tant qu'OpenAPI n'est pas conclu ») fixe l'ordre de la suite :
  reprendre l'adaptateur OpenAPI (section 2), avant toute implémentation
  d'ADR-0037.
- Le point autrefois ouvert (checklist déterministe vs. revue humaine
  seule) est résolu dans le document actuel : les deux mécanismes
  coexistent, voir section 8. Rien ne reste en suspens sur ce sujet
  précis avant l'implémentation.
