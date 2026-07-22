import { MessageProps } from '../interfaces/message-props.interface';

export class MessageEntity {
    constructor(public readonly props: MessageProps) {}

    get error(): boolean {
        return this.props.error;
    }

    get message(): string {
        return this.props.message;
    }
}
