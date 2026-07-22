import { Actor } from '../interfaces/actor.interface';

export class ActorEntity implements Actor {
    constructor(
        public readonly id: string,
        public readonly firstName: string,
        public readonly lastName: string,
        public readonly phone: string,
        public readonly email: string
    ) {}
}
