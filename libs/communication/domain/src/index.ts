// enums (statut/type local par entité — "chacun le sien")
export * from './lib/enums/messaging-type.enum';
export * from './lib/enums/messaging-target.enum';
export * from './lib/enums/messaging-channel.enum';
export * from './lib/enums/notifications-status.enum';

// props
export * from './lib/props/messaging.props';
export * from './lib/props/messaging-find-one.props';

// interfaces (props hors crud-entity — notifications n'est pas cette famille)
export * from './lib/interfaces/notifications-props.interface';

// entities
export * from './lib/entities/messaging.entity';
export * from './lib/entities/messaging-filter.entity';
export * from './lib/entities/messaging-find-one.entity';
export * from './lib/entities/notifications.entity';

// errors
export * from './lib/errors/messaging-sms-content-too-long.error';
export * from './lib/errors/type-required.error';

// contracts
export * from './lib/contracts/messaging-create.contract';
export * from './lib/contracts/messaging-create.validate-contract';
export * from './lib/contracts/messaging-update.contract';
export * from './lib/contracts/messaging-update.validate-contract';
export * from './lib/contracts/messaging-filter.contract';
export * from './lib/contracts/messaging-find-one-filter.contract';
export * from './lib/contracts/messaging-find-one-filter.validate-contract';
export * from './lib/contracts/messaging-delete.contract';
export * from './lib/contracts/messaging-delete.validate-contract';
export * from './lib/contracts/messaging-enable.validate-contract';
export * from './lib/contracts/messaging-disable.validate-contract';
export * from './lib/contracts/notifications-filter.contract';
export * from './lib/contracts/notifications-read-one.validate-contract';

// validators
export * from './lib/validators/messaging-create.validator';
export * from './lib/validators/messaging-update.validator';
export * from './lib/validators/messaging-filter.validator';
export * from './lib/validators/messaging-find-one-filter.validator';
export * from './lib/validators/messaging-delete.validator';
export * from './lib/validators/messaging-enable.validator';
export * from './lib/validators/messaging-disable.validator';
export * from './lib/validators/notifications-filter.validator';
export * from './lib/validators/notifications-read-one.validator';

// value-objects
export * from './lib/value-objects/messaging-create.vo';
export * from './lib/value-objects/messaging-update.vo';
export * from './lib/value-objects/messaging-filter.vo';
export * from './lib/value-objects/messaging-find-one-filter.vo';
export * from './lib/value-objects/messaging-delete.vo';
export * from './lib/value-objects/messaging-enable.vo';
export * from './lib/value-objects/messaging-disable.vo';
export * from './lib/value-objects/notifications-filter.vo';
export * from './lib/value-objects/notifications-read-one.vo';

// repositories (ports)
export * from './lib/repositories/messaging.repository';
export * from './lib/repositories/messaging-find-one.repository';
export * from './lib/repositories/messaging-select.repository';
export * from './lib/repositories/notifications.repository';
