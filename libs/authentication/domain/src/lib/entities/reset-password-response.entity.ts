import { ResetPasswordProps } from '../props/reset-password.props';

/** Réponse d'action one-shot — cf. note `login-response.entity.ts`. */
export class ResetPasswordResponseEntity {
    constructor(private readonly props: ResetPasswordProps) {}

    get message(): string {
        return this.props.message;
    }
}
