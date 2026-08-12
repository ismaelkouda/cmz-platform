# Test de bout en bout — Proposition 1+2 (registre de motifs + punt check)

- **Date :** 2026-08-12
- **Contexte :** suite à `propositions-automatisation-seos.md`, premier
  test réel (pas théorique) du mécanisme proposé — registre de motifs à
  risque (Proposition 1) + arrêt sur absence de citation legacy
  (Proposition 2, "punt check"). Objectif : vérifier que le garde-fou
  fonctionne à la fois quand il doit réussir ET quand il doit s'arrêter,
  avant d'investir davantage.
- **Méthode :** génération à l'aveugle de fichiers jamais consultés
  auparavant dans cette conversation, vérification après coup contre la
  cible réelle déjà `verified` dans le corpus — même protocole que
  `poc-few-shot-legacy-nx.md`, mais avec le registre de motifs appliqué
  explicitement avant génération.

## Test 1 — `report-states.close.list` (motif R-1, résolution attendue)

**Fichier legacy examiné :** `close-filter.entity.ts` — contient
directement `contract.startDate && !contract.endDate ? new Date() :
contract.endDate`.

**Application du registre :** motif R-1 (plage de dates ouverte)
déclenché. Contrairement à `finalization.queues`/`processing.tasks`, la
règle est **présente dans le fichier legacy lui-même** — citation
directe possible, pas d'arrêt nécessaire.

**Génération produite (avant consultation de la cible) :**

```typescript
import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { CloseReportStatesFilterContract } from '../contracts/close-report-states-filter.contract';

export function closeReportStatesFilterEntity(
    contract: CloseReportStatesFilterContract
): CloseReportStatesFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
```

**Résultat :** correspondance **byte-exacte** avec
`libs/report-states/domain/src/lib/entities/close-report-states-filter.
entity.ts` déjà vérifié dans le corpus.

**Verdict :** succès. Le motif était détecté, la règle citable
directement dans le legacy — la proposition 2 fonctionne comme prévu
sur un cas où la génération automatique est légitime.

## Test 2 — `requests.tasks.list` (motif R-1, arrêt attendu)

**Fichier legacy examiné :** `tasks-filter.entity.ts` — classe
positionnelle avec `DatePeriod` opaque, **aucune** résolution de plage
ouverte visible.

**Application du registre :** motif R-1 déclenché (structure identique
à `finalization.queues`/`processing.tasks`, déjà classés catégorie 3).
Vérification complémentaire : `grep -rn "new Date()"` sur tout le module
`requests` (domain + application) — **aucune occurrence**.

**Décision prise :** arrêt. Pas de génération de fichier — conformément
à la Proposition 2, l'absence de citation legacy déclenche une remontée
plutôt qu'une génération par analogie avec les cas déjà vus.

**Vérification a posteriori (pour évaluer, pas pour produire) :** la
cible réelle `tasks-requests-filter.entity.ts` applique bien
`resolveOpenEndedEndDate` — absente de tout le legacy `requests`,
confirmant la classification catégorie 3.

**Verdict :** le garde-fou a correctement refusé de deviner. Le fait
que la réponse "par analogie" se serait révélée juste ne valide pas la
méthode — sur 3 cas de cette famille déjà vus (`requests.queues`,
`finalization.queues`, `processing.tasks`), tous appliquaient la même
règle, ce qui rend une supposition par fréquence statistiquement
correcte à ce stade, mais c'est exactement le risque de mémorisation
plutôt que de déduction déjà nommé dans `poc-few-shot-legacy-nx.md`. Si
un module futur s'écartait de ce motif (comme `report-states.approve`
l'a fait en sens inverse), une génération forcée par analogie se
tromperait sans le savoir.

## Conclusion

Sur 2 tests réels à l'aveugle : 1 génération réussie avec preuve citée
(pas de risque), 1 arrêt correct sans preuve disponible (risque évité).
Aucun faux positif (génération incorrecte non détectée) observé sur cet
échantillon minimal — mais 2 cas ne suffisent pas à mesurer un taux de
fiabilité, seulement à confirmer que le mécanisme se comporte comme
conçu dans les deux branches (résolution / arrêt).

**Ce que ce test ne prouve pas :** un taux de succès généralisable. Il
prouve seulement que le mécanisme fonctionne sur les deux cas testés,
sans halluciner de fausse confiance. La prochaine étape naturelle,
si cette direction est poursuivie, serait d'étendre ce test aux
chaînes restantes non encore examinées, pour mesurer un taux réel
plutôt que deux exemples démonstratifs.

## Références

- [`propositions-automatisation-seos.md`](./propositions-automatisation-seos.md) — Propositions 1 et 2 testées ici.
- [`echantillonnage-regles-non-deductibles.md`](./echantillonnage-regles-non-deductibles.md) — motif R-1 identifié.
- [`poc-few-shot-legacy-nx.md`](./poc-few-shot-legacy-nx.md) — risque de mémorisation nommé initialement.
