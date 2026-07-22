import { MessageProps } from '../props/message.props';

export class MessageEntity {
    constructor(public readonly props: MessageProps) {}

    get error(): boolean {
        return this.props.error;
    }

    get message(): string {
        return this.props.message;
    }
}
