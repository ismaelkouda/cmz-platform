import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'separatorThousands' })
export class SeparatorThousandsPipe implements PipeTransform {
    transform(value: number | string | null | undefined): string {
        if (value === null || value === undefined || value === '') {
            return '0';
        }
        const num =
            typeof value === 'string' ? Number.parseFloat(value) : value;
        if (Number.isNaN(num)) {
            return '0';
        }
        return new Intl.NumberFormat('fr-FR').format(num);
    }
}
