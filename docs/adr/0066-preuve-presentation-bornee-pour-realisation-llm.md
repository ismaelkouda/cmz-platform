# ADR-0066 — Lier une preuve de présentation bornée à la réalisation LLM

- **Statut :** Accepted
- **Date :** 2026-09-25
- **Décideurs :** équipe plateforme CMZ

## Contexte

ADR-0039 borne déjà la réalisation d'une page par un LLM : contrat de page
validé, composition et archétype décidés en amont, cinq fichiers inscriptibles,
inventaire protégé et oracle indépendant. C5f livre de son côté la composition
runtime de la gestion des utilisateurs, mais pas encore son interface visible.

Une interface ne peut pas être déduite complètement des contrats métier. Une
maquette Figma, une capture, un wireframe ou un design system peuvent exprimer
la hiérarchie, les espacements, les composants et le responsive. Ils ne
prouvent toutefois ni les endpoints, ni les permissions, ni les comportements
de succès ou d'erreur.

Donner au LLM un lien vivant vers un outil de design rendrait aussi la
réalisation non reproductible : le contenu pourrait changer entre la
préparation, la génération et la vérification. Les textes ou annotations d'une
source externe doivent enfin être traités comme du contenu non fiable, jamais
comme des instructions capables d'étendre l'autorité de l'agent.

Les précédents industriels convergent vers un transfert de contexte visuel à
un agent de code. Figma précise néanmoins que son serveur MCP transmet du
contexte à traduire selon le framework et les conventions du projet, et non du
code de production canonique.

## Options envisagées

### Option A — Renderer UI entièrement déterministe

- Avantages : sortie répétable sans modèle multimodal ; surface d'autorité
  réduite.
- Inconvénients : nouvelle DSL de mise en page, explosion des variantes,
  duplication d'un moteur UI et faible capacité à préserver une intention
  visuelle riche.

### Option B — Accès direct du LLM au design vivant et au dépôt

- Avantages : expérience rapide, proche des outils de prototypage actuels.
- Inconvénients : entrée mutable, dépendance au fournisseur, autorité trop
  large, exposition aux instructions contenues dans la source, résultat peu
  reproductible.

### Option C — Preuve de présentation immuable dans un work order borné

- Avantages : conserve la souplesse multimodale du LLM tout en figeant la
  provenance, les ressources et leur portée ; reste compatible avec Figma,
  captures, wireframes ou futurs outils ; réutilise le harnais et l'oracle
  existants.
- Inconvénients : exige une étape d'extraction/snapshot et un futur oracle
  visuel ; une revue humaine reste nécessaire pour les écarts esthétiques
  fins.

## Décision

L'option C est retenue.

Une réalisation de page peut recevoir un artefact générique
`presentation-evidence`. Cet artefact possède uniquement l'autorité
`presentation-only`. Il ne peut jamais modifier ni contredire le contrat
backend, le comportement, l'accès, la composition ou l'archétype approuvés.

Le manifeste référence des snapshots locaux par chemin, taille et SHA-256. Il
est indépendant de Figma et du fournisseur de LLM. Chaque source porte :

- une nature générique (`structured-design`, `screenshot`, `wireframe`, etc.) ;
- un but (`primary-layout`, état, responsive, tokens, composants ou feedback) ;
- les états de page concernés et, lorsqu'il s'agit d'une image, son viewport ;
- la marque obligatoire `untrusted-content`.

Le manifeste doit être `approved`, appartenir exactement à la page et contenir
une source `primary-layout`. Les sources inconnues, externes au workspace,
symboliques, trop volumineuses, modifiées, mal typées ou liées à un état absent
échouent fermées avant la création du work order.

Le work order passe en version `2.0.0`. Il incorpore le manifeste et les
ressources normalisées dans son identité adressée par contenu. Un ancien work
order doit être régénéré ; les work orders sont des états éphémères ignorés par
Git, pas des artefacts publiés à migrer.

L'absence de preuve de présentation reste autorisée et explicite par
`presentation_evidence: null`. Dans ce cas le LLM peut suivre le design system
du host, mais ne peut revendiquer aucune fidélité à un design externe.

## Ordre d'autorité

En cas de conflit :

```text
backend et sécurité
  > comportement et accès approuvés
    > composition et design system du dépôt
      > preuve de présentation
        > suggestion du LLM
```

La source visuelle détermine la présentation. Elle ne détermine jamais :

- un endpoint, un champ wire ou une politique réseau ;
- une permission ou un niveau d'accès ;
- une transition de succès ou d'erreur ;
- une invalidation, une notification ou une navigation métier ;
- une nouvelle dépendance partagée.

## Garanties livrées dans ce lot

- Schéma fermé `presentation-evidence` version `1.0.0`.
- Types et médias initiaux fermés, ressources unitaires limitées à 5 Mio,
  bundle limité à 20 Mio et 32 ressources.
- Vérification des chemins réels, tailles, SHA-256 et signatures PNG/JPEG ou
  syntaxe JSON/UTF-8.
- Résolution exacte des états contre le contrat de page.
- Liaison content-addressed au work order et nouvelle validation lors de
  `verify:page-realization`.
- Règles explicites d'autorité de présentation et de contenu non fiable dans
  le work order.
- Compatibilité conservée pour les pages sans preuve visuelle, sans prétention
  de fidélité.

## Conséquences

### Positives

- Le LLM conserve la partie où il apporte le plus de valeur : traduire une
  intention visuelle vers du code Angular ordinaire.
- La plateforme ne devient ni un clone de Figma ni un renderer UI universel.
- Le même work order peut être consommé par Codex, Claude ou un autre modèle.
- Une preuve peut être rejouée même si le document de design vivant a changé.
- Le contenu externe n'obtient aucune autorité supplémentaire sur le dépôt.

### Négatives / dette acceptée

- Aucun adaptateur Figma MCP n'est livré dans ce lot.
- Aucun score de similarité visuelle n'est encore calculé.
- Les mappings vers les composants du dépôt sont transportables comme source
  `component-map`, mais leur propre schéma sémantique reste à prouver avec une
  bibliothèque réelle.
- La sélection visuelle et l'annotation depuis un aperçu restent une capacité
  future du workbench.

### Points à réévaluer

- Ajouter de nouveaux médias seulement avec validation de contenu et menace
  documentée ; SVG et HTML actifs restent interdits dans la version initiale.
- Calibrer l'oracle visuel sur une vraie page C5, avec données, polices,
  viewports et animations déterministes.
- Décider le stockage des artefacts lourds lorsque les limites locales
  deviennent insuffisantes ; un futur blob store devra rester content-addressed.
- Prouver un mapping de composants réel avant de rendre Code Connect ou un
  équivalent obligatoire.

## Références

- [ADR-0039 — Frontière contractuelle entre conception et réalisation par LLM](./0039-frontiere-contractuelle-conception-realisation-llm.md)
- [Figma MCP — Introduction](https://developers.figma.com/docs/figma-mcp-server/)
- [Figma MCP — Le serveur retourne du contexte, pas du code de production](https://developers.figma.com/docs/figma-mcp-server/server-returning-web-code/)
- [Figma — Structure du fichier pour une meilleure sortie](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/)
- [OpenAI — Intégration Codex et Figma](https://openai.com/index/figma-partnership/)
- [Lovable — Importer Figma](https://docs.lovable.dev/integrations/figma)
- [Design2Code](https://arxiv.org/abs/2403.03163)
- [Figma2Code](https://arxiv.org/abs/2604.13648)
