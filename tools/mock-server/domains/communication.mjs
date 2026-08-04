import { fail, ok, readBody, readFormData, send } from '../http.mjs';
import { nextId, now } from '../ids.mjs';
import { paginate, paginateAll } from '../paginate.mjs';
import {
    departments,
    municipalities,
    regions,
} from './administrative-boundary.mjs';

// ---- COMMUNICATION : MESSAGING -------------------------------------------
// Placé après `regions`/`departments`/`municipalities` pour pouvoir référencer
// de vrais ids du cascade (cible `area`) sans dupliquer un jeu de données.
export const messagingItems = [
    {
        id: 'msg-1',
        report_uniq_id: null,
        type: 'awareness',
        target_type: 'area',
        region_id: regions[0].id,
        department_id: departments[0].id,
        municipality_id: null,
        channels: ['push', 'mail'],
        subject: 'Sensibilisation réseau',
        content:
            'Une maintenance est prévue ce week-end sur votre secteur, une coupure temporaire est possible.',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'msg-2',
        report_uniq_id: 'report-123',
        type: 'info',
        target_type: 'report',
        region_id: null,
        department_id: null,
        municipality_id: null,
        channels: ['sms'],
        subject: 'Suivi de votre signalement',
        content: 'Votre signalement #123 a été pris en charge par une équipe.',
        created_at: now(),
        updated_at: now(),
    },
    {
        id: 'msg-3',
        report_uniq_id: null,
        type: 'education',
        target_type: 'area',
        region_id: regions[1] ? regions[1].id : regions[0].id,
        department_id: null,
        municipality_id: null,
        channels: ['push'],
        subject: 'Bonnes pratiques équipements',
        content: 'Rappel des consignes de sécurité autour des sites télécom.',
        created_at: now(),
        updated_at: now(),
    },
];

export function messagingBoundaryOf(list, id) {
    return id ? (list.find((x) => x.id === id) ?? null) : null;
}

export const toMessagingListItem = (m) => {
    const region = messagingBoundaryOf(regions, m.region_id);
    const department = messagingBoundaryOf(departments, m.department_id);
    const municipality = messagingBoundaryOf(municipalities, m.municipality_id);
    return {
        uniq_id: m.id,
        report_id: m.report_uniq_id ?? '',
        type: m.type,
        target_type: m.target_type,
        region: region ? region.name : '',
        department: department ? department.name : '',
        municipality: municipality ? municipality.name : '',
        channels: m.channels,
        subject: m.subject,
        content: m.content,
        created_at: m.created_at,
        updated_at: m.updated_at,
    };
};

export const toMessagingFindOneItem = (m) => {
    const toBoundaryDto = (b) =>
        b ? { id: b.id, name: b.name, code: b.code } : null;
    return {
        uniq_id: m.id,
        report_uniq_id: m.report_uniq_id ?? '',
        type: m.type,
        target_type: m.target_type,
        region: toBoundaryDto(messagingBoundaryOf(regions, m.region_id)),
        department: toBoundaryDto(
            messagingBoundaryOf(departments, m.department_id)
        ),
        municipality: toBoundaryDto(
            messagingBoundaryOf(municipalities, m.municipality_id)
        ),
        channels: m.channels,
        subject: m.subject,
        content: m.content,
        created_at: m.created_at,
        updated_at: m.updated_at,
    };
};

// ---- COMMUNICATION : NOTIFICATIONS (lecture + marquer comme lu) ---------
// `model_type` porte les libellés PascalCase du wire réel (confirmé dans le
// mapper source) — distincts des valeurs domaine (`requests`/…). Champs
// déjà au format wire (`NotificationsItemApiDto`) sinon, pas de mapper dédié
// (même précédent que `accessLogs`).
export const notifications = [
    {
        id: 'notif-1',
        reference: 'REP-2026-014',
        title: 'Nouveau signalement assigné',
        type: 'requests',
        message: 'Un nouveau signalement vous a été assigné pour traitement.',
        status: 'unread',
        model_id: 'REP-2026-014',
        model_type: 'RequestReport',
        sent_at: now(),
        updated_at: now(),
    },
    {
        id: 'notif-2',
        reference: 'REP-2026-009',
        title: 'Signalement en cours de traitement',
        type: 'processing',
        message: 'Le signalement REP-2026-009 est passé en traitement.',
        status: 'unread',
        model_id: 'REP-2026-009',
        model_type: 'ProcessingReport',
        sent_at: now(),
        updated_at: now(),
    },
    {
        id: 'notif-3',
        reference: 'REP-2026-002',
        title: 'Signalement finalisé',
        type: 'finalization',
        message: 'Le signalement REP-2026-002 a été finalisé.',
        status: 'read',
        model_id: 'REP-2026-002',
        model_type: 'FinalizationReport',
        sent_at: now(),
        updated_at: now(),
    },
];


/**
 * @param {{ path: string, method: string, req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, page: string | null, url: URL }} ctx
 * @returns {Promise<boolean|void>|boolean|void} truthy si la route a été servie
 */
export async function handle(ctx) {
    const { path, method, req, res, page, url } = ctx;
    let m;
    // ---- COMMUNICATION : MESSAGING ----
    if (path === 'auth/communication/message-diffusions' && method === 'GET') {
        return send(
            res,
            200,
            ok(paginate(messagingItems.map(toMessagingListItem), page ?? '1'))
        );
    }
    if (
        path === 'auth/communication/message-diffusions/store' &&
        method === 'POST'
    ) {
        const b = await readBody(req);
        messagingItems.unshift({
            id: nextId(),
            report_uniq_id: b.report_uniq_id ?? null,
            type: b.type ?? '',
            target_type: b.target_type ?? '',
            region_id: b.region_id ?? null,
            department_id: b.department_id ?? null,
            municipality_id: b.municipality_id ?? null,
            channels: b.channels ?? [],
            subject: b.subject ?? '',
            content: b.content ?? '',
            created_at: now(),
            updated_at: now(),
        });
        return send(res, 201, ok(null, 'Message créé.'));
    }
    m = path.match(/^auth\/communication\/message-diffusions\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        const message = messagingItems.find((x) => x.id === id);
        if (seg === `${id}/update` && method === 'POST') {
            const b = await readBody(req);
            if (message) {
                Object.assign(message, {
                    report_uniq_id: b.report_uniq_id ?? message.report_uniq_id,
                    type: b.type ?? message.type,
                    target_type: b.target_type ?? message.target_type,
                    region_id: b.region ?? message.region_id,
                    department_id: b.department ?? message.department_id,
                    municipality_id: b.municipality ?? message.municipality_id,
                    channels: b.channels ?? message.channels,
                    subject: b.subject ?? message.subject,
                    content: b.content ?? message.content,
                    updated_at: now(),
                });
            }
            return send(res, 200, ok(null, 'Message mis à jour.'));
        }
        if (seg === `${id}/delete` && method === 'DELETE') {
            const i = messagingItems.findIndex((x) => x.id === id);
            if (i >= 0) messagingItems.splice(i, 1);
            return send(res, 200, ok(null, 'Message supprimé.'));
        }
        if (seg === `${id}/enable` && method === 'PUT') {
            return send(res, 200, ok(null, 'Message activé.'));
        }
        if (seg === `${id}/disable` && method === 'PUT') {
            return send(res, 200, ok(null, 'Message désactivé.'));
        }
        if (method === 'GET') {
            return message
                ? send(res, 200, ok(toMessagingFindOneItem(message)))
                : send(res, 404, fail('Message introuvable.'));
        }
    }

    // ---- COMMUNICATION : NOTIFICATIONS ----
    // Route statique `read-all` déclarée AVANT la regex générique — même
    // précédent que `settings-and-security/user-profiles/select-field`.
    if (path === 'auth/notifications/read-all' && method === 'PUT') {
        notifications.forEach((n) => (n.status = 'read'));
        return send(res, 200, ok(null, 'Notifications marquées comme lues.'));
    }
    if (path === 'auth/notifications' && method === 'GET') {
        return send(res, 200, ok(paginate(notifications, page ?? '1')));
    }
    m = path.match(/^auth\/notifications\/(.+)$/);
    if (m) {
        const seg = m[1];
        const id = seg.split('/')[0];
        if (seg === `${id}/read` && method === 'PUT') {
            const notification = notifications.find((n) => n.id === id);
            if (notification) notification.status = 'read';
            return send(res, 200, ok(null, 'Notification marquée comme lue.'));
        }
    }
    return false;
}
