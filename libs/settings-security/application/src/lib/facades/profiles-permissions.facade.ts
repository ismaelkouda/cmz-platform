import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    ProfilesPermissionsCreateContract,
    ProfilesPermissionsDeleteContract,
    ProfilesPermissionsDisableContract,
    ProfilesPermissionsEnableContract,
    ProfilesPermissionsEntity,
    ProfilesPermissionsFilterContract,
    ProfilesPermissionsUpdateContract,
} from '@cmz/settings-security-domain';
import { ProfilesPermissionsUseCase } from '../use-cases/profiles-permissions.use-case';

@Service()
export class ProfilesPermissionsFacade extends CollectionResourceFacade<
    ProfilesPermissionsEntity,
    ProfilesPermissionsFilterContract
> {
    private readonly useCase = inject(ProfilesPermissionsUseCase);

    protected stream(
        params: PageQuery<ProfilesPermissionsFilterContract>
    ): Observable<PageResult<ProfilesPermissionsEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: ProfilesPermissionsCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: ProfilesPermissionsUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: ProfilesPermissionsDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: ProfilesPermissionsEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: ProfilesPermissionsDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
