import { ForgotPasswordProps } from '../props/forgot-password.props';

/** Réponse d'action one-shot — cf. note `login-response.entity.ts`. */
export class ForgotPasswordResponseEntity {
    constructor(private readonly props: ForgotPasswordProps) {}

    get message(): string {
        return this.props.message;
    }
}
