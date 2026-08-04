import { fail, ok, readBody, readFormData, send } from '../http.mjs';
import { nextId, now } from '../ids.mjs';
import { paginate, paginateAll } from '../paginate.mjs';
import { handleCmsEntity, parseJsonArray } from '../cms.mjs';

// ---- CONTENT-MANAGEMENT : HOME --------------------------------------------
// Un seul objet par item porte l'union des champs liste + détail (comme
// `teams` ci-dessus) — `toHomeListItem`/`toHomeFindOneItem` en dérivent le
// sous-ensemble attendu par chaque DTO wire.
export const homes = [
    {
        id: 'home-1',
        title: 'Bienvenue sur CMZ',
        resume: 'Découvrez nos services de télécommunication.',
        image_url: '/mock/img/home-1.jpg',
        order: 1,
        platforms: ['mobile', 'web'],
        content:
            'Le CMZ accompagne les opérateurs télécom dans la gestion de leurs infrastructures.',
        time_duration_in_seconds: 5,
        button_label: 'En savoir plus',
        button_url: 'https://cmz.tg/services',
        is_active: true,
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2027-01-01T00:00:00.000Z',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'home-2',
        title: 'Nouvelle couverture 5G',
        resume: 'La 5G arrive dans la région Maritime.',
        image_url: '/mock/img/home-2.jpg',
        order: 2,
        platforms: ['mobile', 'web', 'pwa'],
        content: 'Déploiement progressif de la 5G sur les sites majeurs.',
        time_duration_in_seconds: 8,
        button_label: '',
        button_url: '',
        is_active: false,
        start_date: '2025-03-01T00:00:00.000Z',
        end_date: '2026-03-01T00:00:00.000Z',
        created_at: now(),
        updated_at: now(),
    },
];

export const toHomeListItem = (h) => ({
    id: h.id,
    title: h.title,
    resume: h.resume,
    image_url: h.image_url,
    order: h.order,
    platforms: h.platforms,
    is_active: h.is_active,
    created_at: h.created_at,
    updated_at: h.updated_at,
});

export const toHomeFindOneItem = (h) => ({
    id: h.id,
    title: h.title,
    resume: h.resume,
    image_url: h.image_url,
    order: h.order,
    platforms: h.platforms,
    content: h.content,
    time_duration_in_seconds: h.time_duration_in_seconds,
    button_label: h.button_label,
    button_url: h.button_url,
    is_active: h.is_active,
    start_date: h.start_date,
    end_date: h.end_date,
    created_at: h.created_at,
    updated_at: h.updated_at,
});

// ---- CONTENT-MANAGEMENT : SLIDE --------------------------------------------
export const slides = [
    {
        id: 'slide-1',
        type: 'image',
        title: 'Sécurité des sites',
        subtitle: 'Nos équipes veillent 24/7',
        order: 1,
        platforms: ['mobile', 'web'],
        image_url: '/mock/img/slide-1.jpg',
        video_url: '',
        time_duration_in_seconds: 6,
        content: 'Diapositive de présentation de la sécurité des sites.',
        button_label: 'Voir plus',
        button_url: 'https://cmz.tg/securite',
        is_active: true,
        start_date: '2024-02-01T00:00:00.000Z',
        end_date: '2026-02-01T00:00:00.000Z',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'slide-2',
        type: 'video',
        title: 'Extension du réseau fibre',
        subtitle: 'Backbone national en cours',
        order: 2,
        platforms: ['web'],
        image_url: '',
        video_url: 'https://cmz.tg/videos/fibre.mp4',
        time_duration_in_seconds: 10,
        content: 'Vidéo de présentation du réseau fibre optique national.',
        button_label: '',
        button_url: '',
        is_active: false,
        start_date: '2025-05-01T00:00:00.000Z',
        end_date: '2026-05-01T00:00:00.000Z',
        created_at: now(),
        updated_at: now(),
    },
];

export const toSlideListItem = (s) => ({
    id: s.id,
    type: s.type,
    title: s.title,
    subtitle: s.subtitle,
    order: s.order,
    platforms: s.platforms,
    is_active: s.is_active,
    created_at: s.created_at,
    updated_at: s.updated_at,
});

export const toSlideFindOneItem = (s) => ({
    id: s.id,
    is_active: s.is_active,
    order: s.order,
    time_duration_in_seconds: s.time_duration_in_seconds,
    type: s.type,
    image_url: s.image_url,
    video_url: s.video_url,
    platforms: s.platforms,
    start_date: s.start_date,
    end_date: s.end_date,
    title: s.title,
    subtitle: s.subtitle,
    content: s.content,
    button_label: s.button_label,
    button_url: s.button_url,
    created_at: s.created_at,
    updated_at: s.updated_at,
});

// ---- CONTENT-MANAGEMENT : NEWS-CATEGORIES (select seul) --------------------
export const newsCategories = [
    {
        id: 1,
        name: 'Réseau',
        sub_categories: [
            { id: 11, name: 'Fibre optique' },
            { id: 12, name: 'Réseau mobile' },
        ],
    },
    {
        id: 2,
        name: 'Entreprise',
        sub_categories: [{ id: 21, name: 'Partenariats' }],
    },
];
export const categoryRef = (id) => {
    const c = newsCategories.find((cat) => String(cat.id) === String(id));
    return c ? { id: String(c.id), uniq_id: String(c.id), name: c.name } : null;
};
export const subCategoryRef = (id) => {
    for (const cat of newsCategories) {
        const sub = cat.sub_categories.find((s) => String(s.id) === String(id));
        if (sub)
            return {
                id: String(sub.id),
                uniq_id: String(sub.id),
                name: sub.name,
            };
    }
    return null;
};

// ---- CONTENT-MANAGEMENT : NEWS ---------------------------------------------
export const newsItems = [
    {
        id: 'news-1',
        type: 'image',
        title: 'Lancement de la 4G+ à Kara',
        resume: 'Une nouvelle étape pour la couverture régionale.',
        image_url: '/mock/img/news-1.jpg',
        video_url: '',
        order: 1,
        hashtags: ['4G', 'Kara'],
        content:
            'Le déploiement de la 4G+ à Kara marque une avancée majeure pour les usagers de la région.',
        category_id: 1,
        sub_category_id: 12,
        is_published: true,
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'news-2',
        type: 'video',
        title: 'Partenariat stratégique signé',
        resume: 'Un accord pour renforcer le réseau national.',
        image_url: '',
        video_url: 'https://cmz.tg/videos/partenariat.mp4',
        order: 2,
        hashtags: ['partenariat', 'reseau'],
        content:
            'Un partenariat stratégique a été signé pour étendre le réseau.',
        category_id: 2,
        sub_category_id: 21,
        is_published: false,
        created_at: now(),
        updated_at: now(),
    },
];

export const toNewsListItem = (n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    category: categoryRef(n.category_id),
    sub_category: subCategoryRef(n.sub_category_id),
    is_published: n.is_published,
    created_at: n.created_at,
    updated_at: n.updated_at,
});

export const toNewsFindOneItem = (n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    resume: n.resume,
    image_url: n.image_url,
    video_url: n.video_url,
    order: n.order,
    hashtags: n.hashtags,
    content: n.content,
    category: categoryRef(n.category_id),
    sub_category: subCategoryRef(n.sub_category_id),
    is_published: n.is_published,
    created_at: n.created_at,
    updated_at: n.updated_at,
});

// ---- CONTENT-MANAGEMENT : LEGAL-NOTICE / PRIVACY-POLICY / TERMS-USE -------
// Document texte pur (version + contenu), même forme × 3 — factorisé en une
// seule fabrique de seed/mappers paramétrée par libellé.
export function makeDocEntitySeed(labelPrefix) {
    const items = [
        {
            id: `${labelPrefix}-1`,
            version: '1.0',
            content: `Contenu ${labelPrefix} version 1.0.`,
            is_published: true,
            created_at: now(),
            published_at: now(),
            updated_at: now(),
        },
        {
            id: `${labelPrefix}-2`,
            version: '1.1',
            content: `Contenu ${labelPrefix} version 1.1 (brouillon).`,
            is_published: false,
            created_at: now(),
            published_at: '',
            updated_at: now(),
        },
    ];
    const toListItem = (d) => ({
        id: d.id,
        version: d.version,
        is_published: d.is_published,
        created_at: d.created_at,
        published_at: d.published_at,
        updated_at: d.updated_at,
    });
    const toFindOneItem = (d) => ({
        id: d.id,
        version: d.version,
        content: d.content,
        is_published: d.is_published,
        created_at: d.created_at,
        updated_at: d.updated_at,
    });
    return { items, toListItem, toFindOneItem };
}

export const legalNotices = makeDocEntitySeed('legal-notice');
export const privacyPolicies = makeDocEntitySeed('privacy-policy');
export const termsUse = makeDocEntitySeed('terms-use');


/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
    // ---- CONTENT-MANAGEMENT : HOME ----
    // `enable`/`disable` (statut actif/inactif) — comme `site-group`/`teams`.
    if (
        await handleCmsEntity(path, method, req, res, page, {
            base: 'cms/home-block-infos',
            items: homes,
            toListItem: toHomeListItem,
            toFindOneItem: toHomeFindOneItem,
            formData: true,
            actions: {
                on: 'enable',
                off: 'disable',
                field: 'is_active',
                onValue: true,
                offValue: false,
            },
            applyCreate: (b) => ({
                id: nextId(),
                title: b.title ?? '',
                resume: b.resume ?? '',
                image_url: b.image_file ? `/mock/img/${b.image_file}` : '',
                order: homes.length + 1,
                platforms: parseJsonArray(b.platforms),
                content: b.content ?? '',
                time_duration_in_seconds: 5,
                button_label: b.button_label ?? '',
                button_url: b.button_url ?? '',
                is_active: false,
                start_date: b.start_date ?? '',
                end_date: b.end_date ?? '',
                created_at: now(),
                updated_at: now(),
            }),
            applyUpdate: (item, b) =>
                Object.assign(item, {
                    title: b.title ?? item.title,
                    resume: b.resume ?? item.resume,
                    ...(b.image_file
                        ? { image_url: `/mock/img/${b.image_file}` }
                        : {}),
                    platforms: parseJsonArray(b.platforms, item.platforms),
                    content: b.content ?? item.content,
                    button_label: b.button_label ?? '',
                    button_url: b.button_url ?? '',
                    start_date: b.start_date ?? item.start_date,
                    end_date: b.end_date ?? item.end_date,
                    updated_at: now(),
                }),
            labels: {
                created: 'Bloc créé.',
                updated: 'Bloc mis à jour.',
                deleted: 'Bloc supprimé.',
                onMsg: 'Bloc activé.',
                offMsg: 'Bloc désactivé.',
                notFound: 'Bloc introuvable.',
            },
        })
    ) {
        return true;
    }

    // ---- CONTENT-MANAGEMENT : SLIDE ----
    if (
        await handleCmsEntity(path, method, req, res, page, {
            base: 'cms/slides',
            items: slides,
            toListItem: toSlideListItem,
            toFindOneItem: toSlideFindOneItem,
            formData: true,
            actions: {
                on: 'enable',
                off: 'disable',
                field: 'is_active',
                onValue: true,
                offValue: false,
            },
            applyCreate: (b) => ({
                id: nextId(),
                type: b.type ?? 'image',
                title: b.title ?? '',
                subtitle: b.subtitle ?? '',
                order: slides.length + 1,
                platforms: parseJsonArray(b.platforms),
                image_url: b.image_file ? `/mock/img/${b.image_file}` : '',
                video_url: b.video_url ?? '',
                time_duration_in_seconds:
                    Number(b.time_duration_in_seconds) || 0,
                content: b.content ?? '',
                button_label: b.button_label ?? '',
                button_url: b.button_url ?? '',
                is_active: false,
                start_date: b.start_date ?? '',
                end_date: b.end_date ?? '',
                created_at: now(),
                updated_at: now(),
            }),
            applyUpdate: (item, b) =>
                Object.assign(item, {
                    type: b.type ?? item.type,
                    title: b.title ?? item.title,
                    subtitle: b.subtitle ?? item.subtitle,
                    platforms: parseJsonArray(b.platforms, item.platforms),
                    ...(b.image_file
                        ? {
                              image_url: `/mock/img/${b.image_file}`,
                              video_url: '',
                          }
                        : {}),
                    ...(b.video_url
                        ? { video_url: b.video_url, image_url: '' }
                        : {}),
                    time_duration_in_seconds:
                        Number(b.time_duration_in_seconds) ||
                        item.time_duration_in_seconds,
                    content: b.content ?? item.content,
                    button_label: b.button_label ?? '',
                    button_url: b.button_url ?? '',
                    start_date: b.start_date ?? item.start_date,
                    end_date: b.end_date ?? item.end_date,
                    updated_at: now(),
                }),
            labels: {
                created: 'Diapositive créée.',
                updated: 'Diapositive mise à jour.',
                deleted: 'Diapositive supprimée.',
                onMsg: 'Diapositive activée.',
                offMsg: 'Diapositive désactivée.',
                notFound: 'Diapositive introuvable.',
            },
        })
    ) {
        return true;
    }

    // ---- CONTENT-MANAGEMENT : NEWS-CATEGORIES (select seul) ----
    if (path === 'cms/categories/selected-field' && method === 'GET') {
        return send(
            res,
            200,
            ok(
                newsCategories.map((c) => ({
                    id: c.id,
                    name: c.name,
                    sub_categories: c.sub_categories.map((s) => ({
                        id: s.id,
                        name: s.name,
                    })),
                }))
            )
        );
    }

    // ---- CONTENT-MANAGEMENT : NEWS ----
    // `publish`/`unpublish` (pas `enable`/`disable`) — comme les 3 entités
    // document ci-dessous.
    if (
        await handleCmsEntity(path, method, req, res, page, {
            base: 'cms/news',
            items: newsItems,
            toListItem: toNewsListItem,
            toFindOneItem: toNewsFindOneItem,
            formData: true,
            actions: {
                on: 'publish',
                off: 'unpublish',
                field: 'is_published',
                onValue: true,
                offValue: false,
            },
            applyCreate: (b) => ({
                id: nextId(),
                type: b.type ?? 'image',
                title: b.title ?? '',
                resume: b.resume ?? '',
                image_url: b.image_file ? `/mock/img/${b.image_file}` : '',
                video_url: b.video_url ?? '',
                order: newsItems.length + 1,
                hashtags: parseJsonArray(b.hashtags),
                content: b.content ?? '',
                category_id: b.category_id ?? null,
                sub_category_id: b.sub_category_id ?? null,
                is_published: false,
                created_at: now(),
                updated_at: now(),
            }),
            applyUpdate: (item, b) =>
                Object.assign(item, {
                    type: b.type ?? item.type,
                    title: b.title ?? item.title,
                    resume: b.resume ?? item.resume,
                    ...(b.image_file
                        ? {
                              image_url: `/mock/img/${b.image_file}`,
                              video_url: '',
                          }
                        : {}),
                    ...(b.video_url
                        ? { video_url: b.video_url, image_url: '' }
                        : {}),
                    hashtags: parseJsonArray(b.hashtags, item.hashtags),
                    content: b.content ?? item.content,
                    category_id: b.category_id ?? item.category_id,
                    sub_category_id: b.sub_category_id ?? item.sub_category_id,
                    updated_at: now(),
                }),
            labels: {
                created: 'Actualité créée.',
                updated: 'Actualité mise à jour.',
                deleted: 'Actualité supprimée.',
                onMsg: 'Actualité publiée.',
                offMsg: 'Actualité dépubliée.',
                notFound: 'Actualité introuvable.',
            },
        })
    ) {
        return true;
    }

    // ---- CONTENT-MANAGEMENT : LEGAL-NOTICE / PRIVACY-POLICY / TERMS-USE ----
    // JSON simple (buildHttpPayload, pas de fichier) — contrairement à
    // home/slide/news (multipart, `buildFormData`).
    const docEntities = [
        {
            base: 'cms/legal-notices',
            seed: legalNotices,
            labelPrefix: 'Mentions légales',
        },
        {
            base: 'cms/privacy-policies',
            seed: privacyPolicies,
            labelPrefix: 'Politique de confidentialité',
        },
        {
            base: 'cms/terms-of-use',
            seed: termsUse,
            labelPrefix: "Conditions d'utilisation",
        },
    ];
    for (const doc of docEntities) {
        if (
            await handleCmsEntity(path, method, req, res, page, {
                base: doc.base,
                items: doc.seed.items,
                toListItem: doc.seed.toListItem,
                toFindOneItem: doc.seed.toFindOneItem,
                formData: false,
                actions: {
                    on: 'publish',
                    off: 'unpublish',
                    field: 'is_published',
                    onValue: true,
                    offValue: false,
                },
                applyCreate: (b) => ({
                    id: nextId(),
                    version: b.version ?? '',
                    content: b.content ?? '',
                    is_published: false,
                    created_at: now(),
                    published_at: '',
                    updated_at: now(),
                }),
                applyUpdate: (item, b) =>
                    Object.assign(item, {
                        version: b.version ?? item.version,
                        content: b.content ?? item.content,
                        updated_at: now(),
                    }),
                labels: {
                    created: `${doc.labelPrefix} créées.`,
                    updated: `${doc.labelPrefix} mises à jour.`,
                    deleted: `${doc.labelPrefix} supprimées.`,
                    onMsg: `${doc.labelPrefix} publiées.`,
                    offMsg: `${doc.labelPrefix} dépubliées.`,
                    notFound: `${doc.labelPrefix} introuvables.`,
                },
            })
        ) {
            return true;
        }
    }
    return false;
}
