import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
    DialogOutletComponent,
    ToastOutletComponent,
    UiFeedbackService,
} from '@cmz/shared-ui';

@Component({
    imports: [RouterModule, ToastOutletComponent, DialogOutletComponent],
    selector: 'app-root',
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    // Instancie le service de feedback : enregistre le handler d'erreur par défaut.
    private readonly feedback = inject(UiFeedbackService);
}
