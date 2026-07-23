import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'capitalize' })
export class CapitalizePipe implements PipeTransform {
    transform(value: string): string {
        if (!value) {
            return value;
        }
        return value.replace(/\b\w/g, (char) => char.toUpperCase());
    }
}
