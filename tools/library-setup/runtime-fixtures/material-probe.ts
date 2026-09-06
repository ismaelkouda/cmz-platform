import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';

@Component({
    imports: [MatButton],
    selector: 'cmz-material-runtime-probe',
    template: '<button mat-button type="button">Material fonctionne</button>',
})
export class MaterialRuntimeProbe {}
