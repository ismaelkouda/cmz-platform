import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { PermissionTreeNode } from '../props/permission-tree-node.props';

/**
 * Source de l'arbre de permissions "vierge" (tout décoché) pour le mode
 * création du formulaire `profiles-permissions` (`GET
 * settings-and-security/user-profiles/get-permissions-model` côté
 * source). En mode édition, l'arbre (avec état réel coché/décoché) vient
 * directement de `ProfilesPermissionsFindOneEntity.permissions` — ce port
 * n'est donc utilisé qu'à la création, même précédent que
 * `team-organization/TeamsPermissionsRepository`.
 *
 * Ajouté après-coup (Phase 5/UI) : omis en Phase 2, le domaine initial ne
 * couvrait que le CRUD + find-one. Sans ce port, créer un nouveau profil
 * avec des permissions dès la création serait impossible (aucun arbre à
 * afficher tant que l'entité n'existe pas).
 */
export abstract class ProfilesPermissionsPermissionsRepository {
    abstract readAll(options?: FetchOptions): Observable<PermissionTreeNode[]>;
}
