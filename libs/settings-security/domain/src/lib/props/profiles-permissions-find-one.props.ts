import { PermissionTreeNode } from './permission-tree-node.props';

export interface ProfilesPermissionsFindOneProps {
    uniqId: string;
    name: string;
    description: string;
    permissions: PermissionTreeNode[];
}
