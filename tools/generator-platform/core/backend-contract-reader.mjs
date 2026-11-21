// Lecture bornée d'un contrat backend (CI #389, X5) : un seul budget pour tout
// lecteur de contrat, en mode graphe 2.1 (action-request), en list-query v2 et
// à la validation de conception. Un contrat adopté n'est pas une observation
// d'exécution : OBSERVATION_LIMITS (4096 nœuds) reste réservé aux preuves,
// potentiellement hostiles. Mesure : le contrat SEOS adopté compte 4570
// jetons et 52 Ko, refusé à 4096. Ces valeurs sont celles que le compilateur
// action-request 2.1 appliquait déjà ; ACTION_RESULT_GRAPH_LIMITS en dérive.
import { observationInputPrimitives as io } from './runtime-observation-evidence.mjs';

export const CONTRACT_GRAPH_LIMITS = Object.freeze({
    documentBytes: 1048576,
    depth: 32,
    nodes: 32768,
    stringLength: 8192,
    width: 2048,
});

function fail(code) {
    const error = new Error(code);
    error.name = 'ActionResultGraphError';
    error.stack = code;
    throw error;
}

export function parseContractGraph(document) {
    if (Buffer.byteLength(document) > CONTRACT_GRAPH_LIMITS.documentBytes)
        fail('AR_GRAPH_LIMIT');
    return io.parse(Buffer.from(document), CONTRACT_GRAPH_LIMITS);
}
