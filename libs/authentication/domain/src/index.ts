// ---- Shared auth errors / utils ---------------------------------------
export * from './lib/errors/email-required.error';
export * from './lib/errors/invalid-email.error';
export * from './lib/errors/password-required.error';
export * from './lib/errors/confirm-password-required.error';
export * from './lib/errors/confirm-password.error';
export * from './lib/utils/valid-email.util';
export * from './lib/utils/match-confirm-password.util';

// ---- Login -----------------------------------------------------------
export * from './lib/props/login.props';
export * from './lib/entities/login-response.entity';
export * from './lib/contracts/login-request.contract';
export * from './lib/contracts/login-request.validate-contract';
export * from './lib/validators/login-request.validator';
export * from './lib/value-objects/login-request.vo';
export * from './lib/repositories/login.repository';

// ---- Forgot password ---------------------------------------------------
export * from './lib/props/forgot-password.props';
export * from './lib/entities/forgot-password-response.entity';
export * from './lib/contracts/forgot-password-request.contract';
export * from './lib/contracts/forgot-password-request.validate-contract';
export * from './lib/validators/forgot-password-request.validator';
export * from './lib/value-objects/forgot-password-request.vo';
export * from './lib/repositories/forgot-password.repository';

// ---- Reset password -----------------------------------------------------
export * from './lib/props/reset-password.props';
export * from './lib/entities/reset-password-response.entity';
export * from './lib/contracts/reset-password-request.contract';
export * from './lib/contracts/reset-password-request.validate-contract';
export * from './lib/validators/reset-password-request.validator';
export * from './lib/value-objects/reset-password-request.vo';
export * from './lib/repositories/reset-password.repository';
