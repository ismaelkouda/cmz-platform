/**
 * SEOS generate-reference-module — writePresentationUi
 * Extrait mécanique du monolithe (plafond 800 l. CI).
 * Corps non-indenté volontairement : préserve les littéraux de templates.
 */

export function writePresentationUi(ctx) {
    const {
        w,
        E,
        Cap,
        MODULE,
        MODULE_UPPER,
        ENTITY_UPPER,
        ModuleCap,
        FIELD_DEFS,
        FIELD_NAMES,
        REQUIRED_FIELDS,
        EXTRA_FILTERS,
        API_BASE,
        BASE,
        crudOps,
        toSnake,
        pascalCase,
        upperSnake,
    } = ctx;

    // ---------------------------------------------------------------------
    // PRESENTATION — adapters (vm-props/presenter), routes, composants (generique)
    // ---------------------------------------------------------------------

    w(
        `presentation/adapters/${E}/${E}-vm-props.interface.ts`,
        `
export interface ${Cap}VmProps {
    uniqId: string;
${FIELD_NAMES.map((f) => `    ${f}: string;`).join('\n')}
    updatedAt: string;
}
`
    );

    w(
        `presentation/adapters/${E}/${E}-vm.presenter.ts`,
        `
import { ${Cap}Entity } from '${BASE}/domain/entities/${E}/${E}.entity';
import { ${Cap}VmProps } from '${BASE}/presentation/adapters/${E}/${E}-vm-props.interface';

export class ${Cap}Presenter {
    map(item: ${Cap}Entity): ${Cap}VmProps {
        return {
            uniqId: item.uniqId,
${FIELD_NAMES.map((f) => `            ${f}: item.${f},`).join('\n')}
            updatedAt: item.updatedAt,
        };
    }
}
`
    );

    w(
        `presentation/features/${E}/${E}-paths.constants.ts`,
        `
export const ${ENTITY_UPPER}_FORM = 'form';
export const ${ENTITY_UPPER}_LIST = 'list';
export const ${ENTITY_UPPER}_ROUTE = 'list';
`
    );

    w(
        `presentation/features/${E}/${E}.routes.ts`,
        `
import { Routes } from '@angular/router';
import {
    ${ENTITY_UPPER}_FORM,
    ${ENTITY_UPPER}_LIST,
} from '${BASE}/presentation/features/${E}/${E}-paths.constants';

export const ${ENTITY_UPPER}_ROUTES: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: ${ENTITY_UPPER}_LIST,
    },
    {
        path: ${ENTITY_UPPER}_LIST,
        loadComponent: () =>
            import('${BASE}/presentation/features/${E}/${E}-list/${E}-list.component').then(
                (m) => m.${Cap}ListComponent
            ),
    },
    {
        path: ${ENTITY_UPPER}_FORM,
        loadComponent: () =>
            import('${BASE}/presentation/features/${E}/${E}-form/${E}-form.component').then(
                (m) => m.${Cap}FormComponent
            ),
    },
];
`
    );

    // ${MODULE}.routes.ts — fichier RACINE du module (pas sous presentation/features/{ENTITY}/),
    // qui agrege les routes de chaque entite via loadChildren, cable dans src/shared/routes/routes.ts
    // (verifie non mort : import('@pages/administrative-infrastructure/administrative-infrastructure
    // .routes').then((m) => m.routes)). Meme motif que di/${MODULE}.providers.ts : ce generateur ne
    // produit qu'une seule entite synthetique, donc n'agrege qu'un seul bloc — fidele au PATRON
    // (fichier racine qui agrege via loadChildren), pas a la cardinalite du module reel (2 entites).
    w(
        `${MODULE}.routes.ts`,
        `
import { Routes } from '@angular/router';
import { ${ENTITY_UPPER}_ROUTE } from '${BASE}/presentation/features/${E}/${E}-paths.constants';

export const routes: Routes = [
    {
        path: ${ENTITY_UPPER}_ROUTE,
        data: {
            breadcrumb: {
                label: '${MODULE_UPPER}.${ENTITY_UPPER}.BREADCRUMB.LABEL',
                icon: '${MODULE_UPPER}.${ENTITY_UPPER}.BREADCRUMB.ICON',
            },
        },
        children: [
            {
                path: '',
                loadChildren: () =>
                    import('${BASE}/presentation/features/${E}/${E}.routes').then(
                        (m) => m.${ENTITY_UPPER}_ROUTES
                    ),
                data: { breadcrumb: { hide: true } },
            },
            {
                path: '**',
                redirectTo: '',
            },
        ],
    },
];
`
    );

    w(
        `presentation/features/${E}/${E}-list/${E}-list.component.ts`,
        `
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ${Cap}Facade } from '${BASE}/application/services/${E}/${E}.facade';

@Component({
    selector: 'app-${E}-list',
    standalone: true,
    imports: [],
    templateUrl: './${E}-list.component.html',
    styleUrls: ['./${E}-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${Cap}ListComponent implements OnInit {
    private readonly facade = inject(${Cap}Facade);

    ngOnInit(): void {
        this.facade.readAll({});
    }
}
`
    );
    w(
        `presentation/features/${E}/${E}-list/${E}-list.component.html`,
        `<div>${Cap} list — reference template SEOS</div>
`
    );
    w(`presentation/features/${E}/${E}-list/${E}-list.component.scss`, '');

    w(
        `presentation/features/${E}/${E}-form/${E}-form.component.ts`,
        `
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ${Cap}Facade } from '${BASE}/application/services/${E}/${E}.facade';

@Component({
    selector: 'app-${E}-form',
    standalone: true,
    imports: [],
    templateUrl: './${E}-form.component.html',
    styleUrls: ['./${E}-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${Cap}FormComponent {
    private readonly facade = inject(${Cap}Facade);
}
`
    );
    w(
        `presentation/features/${E}/${E}-form/${E}-form.component.html`,
        `<div>${Cap} form — reference template SEOS</div>
`
    );
    w(`presentation/features/${E}/${E}-form/${E}-form.component.scss`, '');

    w(
        `presentation/features/${E}/${E}-page/${E}-page.component.ts`,
        `
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-${E}-page',
    standalone: true,
    imports: [RouterOutlet],
    templateUrl: './${E}-page.component.html',
    styleUrls: ['./${E}-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${Cap}PageComponent {
    protected readonly moduleName = '${E}';
}
`
    );
    w(
        `presentation/features/${E}/${E}-page/${E}-page.component.html`,
        `<router-outlet />
`
    );
    w(`presentation/features/${E}/${E}-page/${E}-page.component.scss`, '');
}
