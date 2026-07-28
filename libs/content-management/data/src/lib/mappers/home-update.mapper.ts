import { Service, inject } from '@angular/core';
import { HomeUpdateProps } from '@cmz/content-management-domain';
import { ApiDateMapper } from '@cmz/shared-data';
import { HomeUpdateApiDto } from '../dtos/home-update-api.dto';

/** Classe injectable — même exception que `HomeCreateMapper` (ApiDateMapper). */
@Service()
export class HomeUpdateMapper {
    private readonly apiDateMapper = inject(ApiDateMapper);

    map(props: HomeUpdateProps): HomeUpdateApiDto {
        const params = {} as HomeUpdateApiDto;
        params.uniq_id = props.uniqId;
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
