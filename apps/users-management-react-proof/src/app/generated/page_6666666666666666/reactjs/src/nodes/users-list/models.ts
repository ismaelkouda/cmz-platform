export interface UsersListItemWire {
    readonly id: string;
    readonly first_name: string;
    readonly last_name: string;
    readonly email: string;
    readonly phone: string;
    readonly profile: string;
    readonly role: string | null;
    readonly status: string;
    readonly created_at: string;
    readonly updated_at: string;
}

export interface UserListItem {
    readonly uniqId: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly phone: string;
    readonly profile: string;
    readonly role: string | null;
    readonly status: string;
    readonly updatedAt: string;
}

export interface ListUsersInput {
    readonly page: number;
    readonly search?: string;
    readonly profile?: string;
    readonly role?: string;
    readonly isActive?: boolean;
}

export interface ListUsersPage {
    readonly items: readonly UserListItem[];
    readonly currentPage: number;
    readonly lastPage: number;
    readonly pageSize: number;
    readonly totalItems: number;
}
