import { Service, inject } from '@angular/core';
import { SlideCreateProps } from '@cmz/content-management-domain';
import { ApiDateMapper } from '@cmz/shared-data';
import { SlideCreateApiDto } from '../dtos/slide-create-api.dto';

/** Classe injectable — même exception que `HomeCreateMapper` (ApiDateMapper). */
@Service()
export class SlideCreateMapper {
    private readonly apiDateMapper = inject(ApiDateMapper);

    map(props: SlideCreateProps): SlideCreateApiDto {
        const params = {} as SlideCreateApiDto;
        params.time_duration_in_seconds = props.timeDuration;
        params.type = props.type;
        params.image_file = (props.image ?? undefined) as
            File | string | undefined;
        params.video_url = props.video ?? undefined;
        params.platforms = props.platforms;
        params.start_date = this.apiDateMapper.toDateTimeApi(
            props.period.start as Date
        );
        params.end_date = this.apiDateMapper.toDateTimeApi(
            props.period.end as Date
        );
        params.title = props.title;
        if (props.subtitle) {
            params.subtitle = props.subtitle;
        }
        if (props.content) {
            params.content = props.content;
        }
        if (props.buttonLabel) {
            params.button_label = props.buttonLabel;
        }
        if (props.buttonUrl) {
            params.button_url = props.buttonUrl;
        }
        return params;
    }
}
