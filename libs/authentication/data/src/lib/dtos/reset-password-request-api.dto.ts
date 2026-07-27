export interface ResetPasswordRequestApiDto {
    token: string;
    email: string;
    password: string;
    confirmPassword: string;
}
