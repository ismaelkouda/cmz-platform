import { Service, inject } from '@angular/core';
import { HomeCreateProps } from '@cmz/content-management-domain';
import { ApiDateMapper } from '@cmz/shared-data';
import { HomeCreateApiDto } from '../dtos/home-create-api.dto';

/**
 * Classe injectable (pas fonction pure) — exception documentée, comme
 * `ParticipantsCreateMapper` sur `team-organization` : a besoin d'une vraie
 * traduction de valeur via un service partagé (`ApiDateMapper`, pour
 * sérialiser `period.start`/`period.end` en date-heure wire). Première
 * consommation réelle de `DatePeriod`/`ApiDateMapper` dans le socle.
 */
@Service()
export class HomeCreateMapper {
    private readonly apiDateMapper = inject(ApiDateMapper);

    map(props: HomeCreateProps): HomeCreateApiDto {
        const params = {} as HomeCreateApiDto;
        params.image_file = props.image as File | string;
        params.platforms = props.platforms;
        params.start_date = this.apiDateMapper.toDateTimeApi(
            props.period.start as Date
        );
        params.end_date = this.apiDateMapper.toDateTimeApi(
            props.period.end as Date
        );
        params.title = props.title;
        params.resume = props.resume;
        params.content = props.content;
        if (props.buttonLabel) {
            params.button_label = props.buttonLabel;
        }
        if (props.buttonUrl) {
            params.button_url = props.buttonUrl;
        }
        return params;
    }
}
