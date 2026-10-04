export type WorkspaceViewLifecycle = 'active' | 'suspended';

/** Métadonnées en mémoire d'une vue réellement ouverte dans le workspace. */
export interface WorkspaceView {
    /** Identité canonique, dérivée de l'URL sans query params ni fragment. */
    id: string;
    /** URL d'activation exacte, paramètres et fragment éventuels compris. */
    url: string;
    /** Libellé déjà traduit par le shell hôte. */
    title: string;
    pinned: boolean;
    closable: boolean;
    dirty: boolean;
    lifecycle: WorkspaceViewLifecycle;
    /** Horodatage monotone interne utilisé seulement pour le retour MRU. */
    lastActivatedAt: number;
}

export interface WorkspaceViewRegistration {
    id: string;
    url: string;
    title: string;
    pinned?: boolean;
}
