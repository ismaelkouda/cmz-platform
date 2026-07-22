import { ActorProps } from '../props/actor.props';

export class ActorEntity implements ActorProps {
    constructor(
        public readonly id: string,
        public readonly firstName: string,
        public readonly lastName: string,
        public readonly phone: string,
        public readonly email: string
    ) {}
}
