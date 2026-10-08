import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

import styles from './page.module.scss';

const COMPACT_MEDIA_QUERY = '(max-width: 50rem)';

export interface IdentifiedItem {
    readonly uniqId: string;
}

export interface CompactUserItem extends IdentifiedItem {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly profile: string;
    readonly role: string | null;
    readonly status: string;
    readonly updatedAt: string;
}

export interface CompactPageRequest {
    readonly attempt: number;
    readonly generation: number;
    readonly pageNumber: number;
}

export interface CompactProjection<TItem extends IdentifiedItem> {
    readonly announcement: string;
    readonly failedRequestKey?: string;
    readonly generation: number;
    readonly lastPage: number;
    readonly pages: ReadonlyMap<number, readonly TItem[]>;
    readonly settledRequestKey?: string;
    readonly totalItems: number;
}

interface CompactUsersResultsProps<TItem extends CompactUserItem> {
    readonly announcement: string;
    readonly failedPage: number | null;
    readonly hasNext: boolean;
    readonly loadingNext: boolean;
    readonly onRetry: () => void;
    readonly sentinelRef: RefObject<HTMLSpanElement | null>;
    readonly totalItems: number;
    readonly users: readonly TItem[];
}

export function compactRequestKey(request: CompactPageRequest): string {
    return `${request.generation}:${request.pageNumber}:${request.attempt}`;
}

export function emptyCompactProjection<TItem extends IdentifiedItem>(
    generation: number
): CompactProjection<TItem> {
    return {
        announcement: '',
        generation,
        lastPage: 1,
        pages: new Map(),
        totalItems: 0,
    };
}

export function flattenCompactPages<TItem extends IdentifiedItem>(
    pages: ReadonlyMap<number, readonly TItem[]>
): readonly TItem[] {
    const items: TItem[] = [];
    const seen = new Set<string>();
    for (let pageNumber = 1; pages.has(pageNumber); pageNumber += 1) {
        for (const item of pages.get(pageNumber) ?? []) {
            if (seen.has(item.uniqId)) continue;
            seen.add(item.uniqId);
            items.push(item);
        }
    }
    return items;
}

export function reduceCompactProjection<TItem extends IdentifiedItem>(
    previous: CompactProjection<TItem>,
    request: CompactPageRequest,
    state: string,
    page:
        | {
              readonly currentPage: number;
              readonly items: readonly TItem[];
              readonly lastPage: number;
              readonly totalItems: number;
          }
        | undefined
): CompactProjection<TItem> {
    const current =
        previous.generation === request.generation
            ? previous
            : emptyCompactProjection<TItem>(request.generation);
    const requestKey = compactRequestKey(request);
    if (state === 'error') {
        return current.failedRequestKey === requestKey
            ? current
            : { ...current, failedRequestKey: requestKey };
    }
    if (
        (state !== 'success' && state !== 'empty') ||
        !page ||
        page.currentPage !== request.pageNumber ||
        current.settledRequestKey === requestKey
    ) {
        return current;
    }
    if (request.pageNumber > 1 && !current.pages.has(page.currentPage - 1)) {
        return current;
    }

    const before = flattenCompactPages(current.pages);
    const pages =
        request.pageNumber === 1
            ? new Map<number, readonly TItem[]>()
            : new Map(current.pages);
    pages.set(request.pageNumber, page.items);
    const added = Math.max(
        0,
        flattenCompactPages(pages).length -
            (request.pageNumber === 1 ? 0 : before.length)
    );
    return {
        announcement:
            request.pageNumber > 1 && added > 0
                ? `${added} utilisateur${added > 1 ? 's' : ''} supplémentaire${added > 1 ? 's' : ''}.`
                : '',
        generation: request.generation,
        lastPage: page.lastPage,
        pages,
        settledRequestKey: requestKey,
        totalItems: page.totalItems,
    };
}

export function useCompactLayout(): boolean {
    const [compact, setCompact] = useState(
        () => window.matchMedia?.(COMPACT_MEDIA_QUERY).matches ?? false
    );

    useEffect(() => {
        const query = window.matchMedia?.(COMPACT_MEDIA_QUERY);
        if (!query) return;
        const update = () => setCompact(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return compact;
}

export function roleLabel(role: string | null): string {
    if (role === 'supervisor') return 'Superviseur';
    if (role === 'team-leader') return "Chef d'équipe";
    if (role === 'agent') return 'Agent';
    return '—';
}

export function statusLabel(status: string): string {
    if (status === 'active') return 'Actif';
    if (status === 'inactive') return 'Inactif';
    if (status === 'blocked') return 'Bloqué';
    if (status === 'pending') return 'En attente';
    return status;
}

export function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return value;
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

export function CompactUsersResults<TItem extends CompactUserItem>({
    announcement,
    failedPage,
    hasNext,
    loadingNext,
    onRetry,
    sentinelRef,
    totalItems,
    users,
}: CompactUsersResultsProps<TItem>) {
    return (
        <section
            data-cmz-id="mobile-results"
            className={styles.mobileResults}
            role="region"
            aria-label="Utilisateurs"
            aria-busy={loadingNext ? true : undefined}
        >
            <div className={styles.mobileSummary}>
                <strong>{totalItems} utilisateurs</strong>
                <span>{users.length} affichés</span>
            </div>
            <ul
                data-cmz-id="mobile-user-list"
                className={styles.mobileUserList}
            >
                {users.map((user) => (
                    <li key={user.uniqId} data-cmz-user-id={user.uniqId}>
                        <article className={styles.userCard}>
                            <div>
                                <strong>
                                    {user.lastName} {user.firstName}
                                </strong>
                                <span
                                    className={`${styles.status} ${styles[`status-${user.status}`] ?? ''}`}
                                >
                                    {statusLabel(user.status)}
                                </span>
                            </div>
                            <p>{user.email}</p>
                            <p>
                                {user.profile} · {roleLabel(user.role)}
                            </p>
                            <p className={styles.userUpdated}>
                                Mis à jour le {formatDate(user.updatedAt)}
                            </p>
                        </article>
                    </li>
                ))}
            </ul>
            <p
                data-cmz-id="mobile-load-status"
                className="sr-only"
                aria-live="polite"
            >
                {loadingNext
                    ? 'Chargement d’utilisateurs supplémentaires.'
                    : announcement}
            </p>
            {failedPage !== null && (
                <div className={styles.mobileLoadError} role="alert">
                    <span>
                        Les utilisateurs suivants n’ont pas pu être chargés.
                    </span>
                    <button
                        data-cmz-id="mobile-load-retry"
                        type="button"
                        className={styles.secondaryAction}
                        onClick={onRetry}
                    >
                        Réessayer
                    </button>
                </div>
            )}
            {(hasNext || loadingNext || failedPage !== null) && (
                <span
                    ref={sentinelRef}
                    data-cmz-id="mobile-load-sentinel"
                    className={styles.mobileLoadSentinel}
                    aria-hidden="true"
                />
            )}
        </section>
    );
}
