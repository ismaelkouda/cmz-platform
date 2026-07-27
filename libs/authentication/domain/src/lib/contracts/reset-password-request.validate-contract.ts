export interface ResetPasswordRequestValidateContract {
    token: string;
    email: string;
    password: string;
    confirmPassword: string;
}
