export interface CreateUserInput {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly phone: string;
    readonly profileId: string;
}

export interface CreateUserRequestWire {
    readonly first_name: string;
    readonly last_name: string;
    readonly email: string;
    readonly phone: string;
    readonly profile_id: string;
}

export interface MessageResponseWire {
    readonly error: boolean;
    readonly message: string;
}

export interface CreateUserResult {
    readonly message: string;
}
