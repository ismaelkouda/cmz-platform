import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
} from '@angular/core';
import { ResourcesFacade } from '@pages/seos-reference/application/services/resources/resources.facade';

@Component({
    selector: 'app-resources-list',
    standalone: true,
    imports: [],
    templateUrl: './resources-list.component.html',
    styleUrls: ['./resources-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourcesListComponent implements OnInit {
    private readonly facade = inject(ResourcesFacade);

    ngOnInit(): void {
        this.facade.readAll({});
    }
}
