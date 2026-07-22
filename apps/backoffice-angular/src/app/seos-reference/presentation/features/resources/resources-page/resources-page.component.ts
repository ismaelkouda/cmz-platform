import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-resources-page',
    standalone: true,
    imports: [RouterOutlet],
    templateUrl: './resources-page.component.html',
    styleUrls: ['./resources-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourcesPageComponent {
    protected readonly moduleName = 'resources';
}
