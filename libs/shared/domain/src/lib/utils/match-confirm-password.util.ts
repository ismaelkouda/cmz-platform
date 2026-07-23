export function isMatchConfirmPassword(
    password: string,
    confirmPassword: string
): boolean {
    return password === confirmPassword;
}
