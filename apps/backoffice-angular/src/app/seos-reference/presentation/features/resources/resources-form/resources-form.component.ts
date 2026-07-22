import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ResourcesFacade } from '@pages/seos-reference/application/services/resources/resources.facade';

@Component({
    selector: 'app-resources-form',
    standalone: true,
    imports: [],
    templateUrl: './resources-form.component.html',
    styleUrls: ['./resources-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourcesFormComponent {
    private readonly facade = inject(ResourcesFacade);
}
