# ADR-0033 — Propriété des artefacts et régénération non destructive

- **Statut :** Accepted
- **Date :** 2026-08-16

## Contexte

La plateforme doit pouvoir reprendre une composition mémorisée, la faire évoluer
et régénérer ses cibles. Une régénération devient dangereuse dès qu'un
développeur modifie un fichier également contrôlé par le générateur.

Le merge textuel, les marqueurs de zones éditables et la réinterprétation de
code arbitraire rendent la propriété ambiguë. Ils ne permettent pas de prouver
qu'une extension humaine a été conservée, particulièrement lorsque la structure
générée change simultanément.

Les CLI actuelles refusent d'écraser un répertoire existant. Cette protection
évite une perte immédiate, mais ne fournit ni évolution incrémentale, ni analyse
d'impact, ni contrat d'extension.

## Options envisagées

### Option A — Fichiers mixtes et fusion textuelle

- Avantages : expérience initiale familière ; peu de fichiers supplémentaires.
- Inconvénients : conflits difficiles à interpréter ; dépendance au langage et
  au formatage ; impossibilité de prouver la conservation sémantique.

### Option B — Régénération totale et interdiction de code manuel

- Avantages : propriété simple ; déterminisme fort.
- Inconvénients : ne couvre pas les intégrations et adaptations irréductibles ;
  pousse les équipes à forker les sorties générées.

### Option C — Propriété exclusive et extensions par contrats

- Avantages : non-destruction vérifiable ; responsabilités explicites ; replay
  et rollback possibles ; extensions indépendantes du renderer.
- Inconvénients : architecture de ports/slots à concevoir ; davantage
  d'artefacts ; migration nécessaire pour les sorties existantes.

## Décision

**Option C.** Chaque artefact possède exactement un owner : `generator-owned`,
`human-owned`, `configuration-owned` ou `external-owned`. Les fichiers à
propriété mixte sont interdits par défaut.

Le générateur remplace uniquement les artefacts `generator-owned`. Les
extensions humaines sont raccordées par des contrats et slots typés, possèdent
leurs propres fichiers et sont enregistrées par hash dans le manifest.

Toute régénération est préparée dans un espace temporaire, validée par les
Oracles puis publiée atomiquement. Un échec laisse la version précédente
intacte. Le changement d'un contrat d'extension est une migration explicite.

## Justification

La propriété exclusive transforme « ne pas perdre le code » en invariant
machine-readable. Comparer les hashes, contrôler les chemins autorisés et
publier transactionnellement sont des opérations déterministes. Fusionner du
texte arbitraire ne l'est pas.

Les contrats d'extension permettent aux stacks d'adapter leur mécanisme de
raccordement tout en partageant la même sémantique de slot et le même ordre dans
le graphe d'exécution.

## Conséquences

### Positives

- Une extension humaine peut être vérifiée octet par octet après régénération.
- Les suppressions d'artefacts sont gouvernées par ownership.
- Le dry-run et le Change Set sont implémentés pour les artefacts
  `generator-owned/replace` et le slot `after-success` `human-owned/preserve`;
  `--apply <change_set_id>` prépare une arborescence candidate, revalide le
  Change Set exact et publie avec rollback sur erreur de commit.
- Le nouveau `generation-control-manifest.json` étend le contrôle de drift aux
  modèles et à l'Artifact Plan situés à la racine de la sortie.
- Les renderers n'ont pas besoin d'analyser du code humain arbitraire.

### Négatives / dette acceptée

- Le manifest 1.1 enregistre le squelette initial du slot humain. En dry-run et
  en publication, le Change Set capture le hash réellement observé ;
  `--apply <change_set_id>` persiste ce hash dans le nouveau manifest sans
  réécrire les octets humains. L'identifiant lie l'écriture à l'état revu.
- La publication sérialise les générateurs par un verrou exclusif complet publié
  par renommage. Les fichiers candidats, répertoires et phases du journal sont
  synchronisés avant publication. Au redémarrage, la reprise restaure la version
  précédente ou n'accepte la nouvelle qu'après vérification des manifests et de
  chaque contenu ; un état ambigu échoue fermé et conserve l'arbre de secours.
- Node ne fournit pas d'échange atomique portable de deux répertoires non vides.
  ADR-0035 borne donc la v1 à une activation hors ligne après succès : les
  lecteurs externes concurrents ne sont pas supportés. APFS/macOS et ext4/Linux
  sont les seuls profils de stockage admis ; le runtime les vérifie avant
  écriture. Les tests `SIGKILL`, le probe sur primitives réelles et la matrice
  CI dédiée constituent le gate de durabilité. La première matrice externe verte
  reste requise avant promotion M3.
- Les contrats d'extension initiaux devront rester volontairement étroits.
- Les modifications manuelles de fichiers générés et tout artefact sans owner
  sont refusés avant application du Change Set.
- La survie du slot humain à une publication effective est prouvée sur Angular
  et ReactJS pour `action-request` et `workflow-action` ; la lacune
  `regeneration.existing-output` est retirée du contrat directeur.

### Points à réévaluer

- Introduire une propriété mixte seulement si une représentation structurelle,
  une détection de conflits et un Oracle par langage sont démontrés.
- Réviser les slots si les extensions contournent régulièrement les invariants
  du graphe ou les permissions.
- Suspendre la régénération incrémentale si la publication ne peut pas être
  rendue transactionnelle.

## Références

- [ADR-0031](./0031-graphe-execution-et-manifests-composition.md)
- [ADR-0032](./0032-cycle-vie-compositions-et-promotion-patterns.md)
- [ADR-0035](./0035-contrat-durabilite-publication-generation.md)
- [`conception-compositions-evolutives-patterns-memorises.md`](../architecture/conception-compositions-evolutives-patterns-memorises.md)
- [Contrat directeur exécutable](../../tools/generator-platform/acceptance/evolvable-composition.contract.json)
