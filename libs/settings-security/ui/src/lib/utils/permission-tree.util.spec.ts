import { PermissionTreeNode } from '@cmz/settings-security-domain';
import {
    toggleNodeChecked,
    toggleNodeAction,
    treeToPermissionsPayload,
} from './permission-tree.util';

describe('permission-tree.util', () => {
    const mockTree: PermissionTreeNode[] = [
        {
            key: 'organization',
            label: 'Organisation',
            checked: false,
            actions: { read: false, write: false },
            children: [
                {
                    key: 'agents',
                    label: 'Agents',
                    checked: false,
                    actions: { read: false, write: false },
                    children: [],
                },
            ],
        },
    ];

    it('toggleNodeChecked coche le nœud et tous ses enfants récursivement', () => {
        const updated = toggleNodeChecked(mockTree, 'organization');

        expect(updated[0].checked).toBe(true);
        expect(updated[0].actions).toEqual({ read: true, write: true });
        expect(updated[0].children[0].checked).toBe(true);
        expect(updated[0].children[0].actions).toEqual({
            read: true,
            write: true,
        });
    });

    it('toggleNodeAction modifie une action spécifique et met à jour checked', () => {
        const updated = toggleNodeAction(mockTree, 'organization', 'read');

        expect(updated[0].actions.read).toBe(true);
        expect(updated[0].actions.write).toBe(false);
        expect(updated[0].checked).toBe(true);
    });

    it('treeToPermissionsPayload aplatit l arbre en un objet de permissions valides', () => {
        const checkedTree = toggleNodeAction(mockTree, 'agents', 'read');
        const payload = treeToPermissionsPayload(checkedTree);

        expect(payload).toEqual({
            agents: ['read'],
        });
    });
});
