/**
 * SEOS generate-reference-module — writeDomain
 * Extrait mécanique du monolithe (plafond 800 l. CI).
 * Corps non-indenté volontairement : préserve les littéraux de templates.
 */

export function writeDomain(ctx) {
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
    // DOMAIN — interfaces (props)
    // ---------------------------------------------------------------------

    w(
        `domain/interfaces/${E}/${E}-props.interface.ts`,
        `
export interface ${Cap}Props {
    uniqId: string;
${FIELD_NAMES.map((f) => `    ${f}: string;`).join('\n')}
    createdAt: string;
    updatedAt: string;
}
`
    );

    w(
        `domain/interfaces/${E}/${E}-find-one-props.interface.ts`,
        `
export interface ${Cap}FindOneProps {
    uniqId: string;
${FIELD_NAMES.map((f) => `    ${f}: string;`).join('\n')}
    updatedAt: string;
}
`
    );

    // ---------------------------------------------------------------------
    // DOMAIN — entities
    // ---------------------------------------------------------------------

    w(
        `domain/entities/${E}/${E}.entity.ts`,
        `
import { ${Cap}Props } from '${BASE}/domain/interfaces/${E}/${E}-props.interface';

export class ${Cap}Entity {
    constructor(private readonly props: ${Cap}Props) {}

    get uniqId(): string {
        return this.props.uniqId;
    }
${FIELD_NAMES.map(
    (f) => `    get ${f}(): string {
        return this.props.${f};
    }`
).join('\n')}
    get createdAt(): string {
        return this.props.createdAt;
    }
    get updatedAt(): string {
        return this.props.updatedAt;
    }

    public with(props: ${Cap}Props): ${Cap}Entity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new ${Cap}Entity(props);
    }
}
`
    );

    w(
        `domain/entities/${E}/${E}-find-one.entity.ts`,
        `
import { ${Cap}FindOneProps } from '${BASE}/domain/interfaces/${E}/${E}-find-one-props.interface';

export class ${Cap}FindOneEntity {
    constructor(private readonly props: ${Cap}FindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }
${FIELD_NAMES.map(
    (f) => `    get ${f}(): string {
        return this.props.${f};
    }`
).join('\n')}
    get updatedAt(): string {
        return this.props.updatedAt;
    }

    public with(props: ${Cap}FindOneProps): ${Cap}FindOneEntity {
        if (
            this.updatedAt === props.updatedAt &&
            this.uniqId === props.uniqId
        ) {
            return this;
        }
        return new ${Cap}FindOneEntity(props);
    }
}
`
    );

    // select : PAS d'Entity dediee (v16) — {ENTITY}SelectEntity etait un wrapper
    // pass-through pur (constructeur + 2 getters recopiant Props sans transformation),
    // meme profil que les Entity create/update/delete/filter deja eliminees en v7.
    // Remplace par le type partage @shared/domain/interfaces/select-option.interface.ts
    // (SelectOption), utilise directement par repository/impl/use-case/facade/mapper.

    // filter "entity" : fonction (jamais une classe, Experience 007/010), conservee
    // uniquement parce qu'elle porte une vraie regle metier au-dela du passthrough — modele
    // exact d'infrastructureFilterEntity : defaut endDate = aujourd'hui si startDate est
    // fourni sans endDate.
    w(
        `domain/entities/${E}/${E}-filter.entity.ts`,
        `
import { ${Cap}FilterContract } from '${BASE}/domain/contracts/${E}/${E}-filter.contract';
import { resolveOpenEndedEndDate } from '@shared/domain/utils/resolve-open-ended-end-date.util';

export function ${E}FilterEntity(
    contract: ${Cap}FilterContract
): ${Cap}FilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
`
    );

    // ---------------------------------------------------------------------
    // DOMAIN — contracts / validate-contracts / validators / value-objects
    // ---------------------------------------------------------------------

    w(
        `domain/contracts/${E}/${E}-filter.contract.ts`,
        `
export interface ${Cap}FilterContract {
    search?: string;
${EXTRA_FILTERS.map((f) => `    ${f}?: string;`).join('\n')}
    startDate?: Date;
    endDate?: Date;
}
`
    );

    w(
        `domain/validators/${E}/${E}-filter.validator.ts`,
        `
import { ${Cap}FilterContract } from '${BASE}/domain/contracts/${E}/${E}-filter.contract';
import { assertValidDateRange } from '@shared/domain/validators/assert-valid-date-range.validator';

export function validate${Cap}Filter(
    contract: ${Cap}FilterContract
): asserts contract is ${Cap}FilterContract {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
`
    );

    w(
        `domain/value-objects/${E}/${E}-filter.vo.ts`,
        `
import { ${Cap}FilterContract } from '${BASE}/domain/contracts/${E}/${E}-filter.contract';
import { validate${Cap}Filter } from '${BASE}/domain/validators/${E}/${E}-filter.validator';

export function ${E}FilterVo(
    contract: ${Cap}FilterContract
): ${Cap}FilterContract {
    validate${Cap}Filter(contract);
    return contract;
}
`
    );

    // find-one-filter : Contract (optionnel) / ValidateContract (strict) / Validator reels —
    // verifie sur infrastructure-find-one-filter.{contract,validate-contract,validator}.ts :
    // ce n'est PAS un simple wrapper de type comme le supposait l'ancienne version de ce
    // generateur (classe ${Cap}FindOneFilterVo sans validation). uniqId est requis et sa
    // validation peut lever GenericRequiredError, donc find-one.execute() doit etre sous
    // defer() (voir use-case plus bas).
    w(
        `domain/contracts/${E}/${E}-find-one-filter.contract.ts`,
        `
export interface ${Cap}FindOneFilterContract {
    uniqId?: string;
}
`
    );
    w(
        `domain/contracts/${E}/${E}-find-one-filter.validate-contract.ts`,
        `
export interface ${Cap}FindOneFilterValidateContract {
    uniqId: string;
}
`
    );
    w(
        `domain/validators/${E}/${E}-find-one-filter.validator.ts`,
        `
import { ${Cap}FindOneFilterContract } from '${BASE}/domain/contracts/${E}/${E}-find-one-filter.contract';
import { ${Cap}FindOneFilterValidateContract } from '${BASE}/domain/contracts/${E}/${E}-find-one-filter.validate-contract';
import { GenericRequiredError } from '@shared/domain/errors/validation/generic.error';

export function validate${Cap}FindOneFilter(
    contract: ${Cap}FindOneFilterContract
): asserts contract is ${Cap}FindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            '${MODULE_UPPER}.${ENTITY_UPPER}.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
`
    );
    w(
        `domain/value-objects/${E}/${E}-find-one-filter.vo.ts`,
        `
import { ${Cap}FindOneFilterContract } from '${BASE}/domain/contracts/${E}/${E}-find-one-filter.contract';
import { ${Cap}FindOneFilterValidateContract } from '${BASE}/domain/contracts/${E}/${E}-find-one-filter.validate-contract';
import { validate${Cap}FindOneFilter } from '${BASE}/domain/validators/${E}/${E}-find-one-filter.validator';

export function ${E}FindOneFilterVo(
    contract: ${Cap}FindOneFilterContract
): ${Cap}FindOneFilterValidateContract {
    validate${Cap}FindOneFilter(contract);
    return contract;
}
`
    );

    // delete : Contract (optionnel) / ValidateContract (strict) / Validator reels — verifie
    // sur infrastructure-delete.{contract,validate-contract,validator}.ts. L'ancienne version
    // de ce generateur traitait delete comme un VO identite pur ("uniqId deja garanti par le
    // type au niveau du Dto") : faux pour le module de reference reel, ou uniqId est
    // explicitement re-valide au niveau domaine (defense en profondeur, independante du Dto
    // applicatif) et peut donc lever GenericRequiredError — d'ou defer() requis aussi ici.
    w(
        `domain/contracts/${E}/${E}-delete.contract.ts`,
        `
export interface ${Cap}DeleteContract {
    uniqId?: string;
}
`
    );
    w(
        `domain/contracts/${E}/${E}-delete.validate-contract.ts`,
        `
export interface ${Cap}DeleteValidateContract {
    uniqId: string;
}
`
    );
    w(
        `domain/validators/${E}/${E}-delete.validator.ts`,
        `
import { ${Cap}DeleteContract } from '${BASE}/domain/contracts/${E}/${E}-delete.contract';
import { ${Cap}DeleteValidateContract } from '${BASE}/domain/contracts/${E}/${E}-delete.validate-contract';
import { GenericRequiredError } from '@shared/domain/errors/validation/generic.error';

export function validate${Cap}Delete(
    contract: ${Cap}DeleteContract
): asserts contract is ${Cap}DeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            '${MODULE_UPPER}.${ENTITY_UPPER}.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
`
    );
    w(
        `domain/value-objects/${E}/${E}-delete.vo.ts`,
        `
import { ${Cap}DeleteContract } from '${BASE}/domain/contracts/${E}/${E}-delete.contract';
import { ${Cap}DeleteValidateContract } from '${BASE}/domain/contracts/${E}/${E}-delete.validate-contract';
import { validate${Cap}Delete } from '${BASE}/domain/validators/${E}/${E}-delete.validator';

export function ${E}DeleteVo(
    contract: ${Cap}DeleteContract
): ${Cap}DeleteValidateContract {
    validate${Cap}Delete(contract);
    return contract;
}
`
    );

    // create / update : Contract (champs optionnels) / ValidateContract (champs stricts) /
    // Validator (assertion function, un throw GenericRequiredError par champ requis) / VO
    // (fonction, retour explicite champ par champ — modele infrastructureCreateVo/
    // infrastructureUpdateVo).
    for (const { kind, fields } of crudOps) {
        const Kind = kind[0].toUpperCase() + kind.slice(1);
        const allFormFields = fields.filter((f) => f !== 'uniqId');
        const requiredForOp =
            kind === 'update'
                ? ['uniqId', ...REQUIRED_FIELDS]
                : [...REQUIRED_FIELDS];

        w(
            `domain/contracts/${E}/${E}-${kind}.contract.ts`,
            `
export interface ${Cap}${Kind}Contract {
    ${kind === 'update' ? 'uniqId?: string;\n    ' : ''}${allFormFields
        .map((f) => `${f}?: string;`)
        .join('\n    ')}
}
`
        );
        w(
            `domain/contracts/${E}/${E}-${kind}.validate-contract.ts`,
            `
export interface ${Cap}${Kind}ValidateContract {
    ${kind === 'update' ? 'uniqId: string;\n    ' : ''}${allFormFields
        .map((f) =>
            REQUIRED_FIELDS.includes(f) ? `${f}: string;` : `${f}?: string;`
        )
        .join('\n    ')}
}
`
        );
        w(
            `domain/validators/${E}/${E}-${kind}.validator.ts`,
            `
import { ${Cap}${Kind}Contract } from '${BASE}/domain/contracts/${E}/${E}-${kind}.contract';
import { ${Cap}${Kind}ValidateContract } from '${BASE}/domain/contracts/${E}/${E}-${kind}.validate-contract';
import { GenericRequiredError } from '@shared/domain/errors/validation/generic.error';

export function validate${Cap}${Kind}(
    contract: ${Cap}${Kind}Contract
): asserts contract is ${Cap}${Kind}ValidateContract {
${requiredForOp
    .map(
        (f) => `    if (!contract.${f}) {
        throw new GenericRequiredError(
            '${MODULE_UPPER}.${ENTITY_UPPER}.FORM.ERROR.${kind.toUpperCase()}.${f
                .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
                .replace(/-/g, '_')
                .toUpperCase()}_REQUIRE'
        );
    }`
    )
    .join('\n')}
}
`
        );
        w(
            `domain/value-objects/${E}/${E}-${kind}.vo.ts`,
            `
import { ${Cap}${Kind}Contract } from '${BASE}/domain/contracts/${E}/${E}-${kind}.contract';
import { ${Cap}${Kind}ValidateContract } from '${BASE}/domain/contracts/${E}/${E}-${kind}.validate-contract';
import { validate${Cap}${Kind} } from '${BASE}/domain/validators/${E}/${E}-${kind}.validator';

export function ${E}${Kind}Vo(
    contract: ${Cap}${Kind}Contract
): ${Cap}${Kind}ValidateContract {
    validate${Cap}${Kind}(contract);
    return {
        ${kind === 'update' ? 'uniqId: contract.uniqId,\n        ' : ''}${allFormFields
            .map((f) => `${f}: contract.${f}`)
            .join(',\n        ')}
    };
}
`
        );

        w(
            `application/dto/${E}/${E}-${kind}.dto.ts`,
            `
export interface ${Cap}${Kind}Dto {
    ${kind === 'update' ? 'uniqId: string;\n    ' : ''}${allFormFields
        .map((f) => `${f}?: string;`)
        .join('\n    ')}
}
`
        );
    }

    w(
        `application/dto/${E}/${E}-delete.dto.ts`,
        `
export interface ${Cap}DeleteDto {
    uniqId: string;
}
`
    );
    w(
        `application/dto/${E}/${E}-filter.dto.ts`,
        `
export interface ${Cap}FilterDto {
    search?: string;
${EXTRA_FILTERS.map((f) => `    ${f}?: string;`).join('\n')}
    startDate?: Date;
    endDate?: Date;
}
`
    );
    w(
        `application/dto/${E}/${E}-find-one-filter.dto.ts`,
        `
export interface ${Cap}FindOneFilterDto {
    uniqId: string;
}
`
    );

    // presentation/constants : regles de validation de formulaire (regex/longueurs),
    // partagees a l'echelle du module (1 fichier, pas par entite) — PAS un Validator au
    // sens Contract -> ValidateContract de ce projet (pas de throw, pas d'assertion
    // function), d'ou presentation/constants et pas domain/*. Verifie (Experience 047) :
    // aucun domain/validators/{ENTITY}/*.validator.ts ne reference FormValidators — seuls
    // presentation/store/*.store.ts et presentation/features/*.component.ts le consomment,
    // pour alimenter Validators.pattern/minLength/maxLength d'Angular Reactive Forms. C'est
    // une contrainte de couche presentation, pas un invariant de domaine. Convention reelle
    // deja existante confirmant ce choix : authentication/presentation/constants/{feature}/
    // {feature}-form-error-messages.constant.ts. Modele exact : le fichier reel
    // d'administrative-infrastructure ne fait que reexporter le socle commun partage
    // (voir @shared/presentation/constants/form-validators.constants.ts) sans ajouter de
    // cle propre — ce module synthetique suit le meme motif.
    w(
        `presentation/constants/form-validators.constants.ts`,
        `
import { COMMON_FORM_VALIDATORS } from '@shared/presentation/constants/form-validators.constants';

export const FormValidators = COMMON_FORM_VALIDATORS;
`
    );

    // ---------------------------------------------------------------------
    // DOMAIN — repositories (abstraits, convention POINT — Experience 029/v14)
    // ---------------------------------------------------------------------

    w(
        `domain/repositories/${E}/${E}.repository.ts`,
        `
import { Injectable } from '@angular/core';
import { ${Cap}CreateValidateContract } from '${BASE}/domain/contracts/${E}/${E}-create.validate-contract';
import { ${Cap}DeleteValidateContract } from '${BASE}/domain/contracts/${E}/${E}-delete.validate-contract';
import { ${Cap}FilterContract } from '${BASE}/domain/contracts/${E}/${E}-filter.contract';
import { ${Cap}UpdateValidateContract } from '${BASE}/domain/contracts/${E}/${E}-update.validate-contract';
import { ${Cap}Entity } from '${BASE}/domain/entities/${E}/${E}.entity';
import {
    MessageResponseDto,
    Paginate,
} from '@shared/data/dto/simple-response.dto';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export abstract class ${Cap}Repository {
    abstract execute(
        validContract: ${Cap}FilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<Paginate<${Cap}Entity>>;
    abstract create(
        validContract: ${Cap}CreateValidateContract
    ): Observable<MessageResponseDto>;
    abstract update(
        validContract: ${Cap}UpdateValidateContract
    ): Observable<MessageResponseDto>;
    abstract delete(
        validContract: ${Cap}DeleteValidateContract
    ): Observable<MessageResponseDto>;
}
`
    );

    w(
        `domain/repositories/${E}/${E}-find-one.repository.ts`,
        `
import { ${Cap}FindOneEntity } from '${BASE}/domain/entities/${E}/${E}-find-one.entity';
import { ${Cap}FindOneFilterValidateContract } from '${BASE}/domain/contracts/${E}/${E}-find-one-filter.validate-contract';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

export abstract class ${Cap}FindOneRepository {
    abstract execute(
        validContract: ${Cap}FindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<${Cap}FindOneEntity>;
}
`
    );

    w(
        `domain/repositories/${E}/${E}-select.repository.ts`,
        `
import { SelectOption } from '@shared/domain/interfaces/select-option.interface';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

export abstract class ${Cap}SelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
`
    );
}
