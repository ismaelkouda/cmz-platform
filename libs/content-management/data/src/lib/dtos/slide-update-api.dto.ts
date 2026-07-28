/**
 * Identifiant `id` (pas `uniq_id`) — cohérent avec slide/news/legal-notice/
 * privacy-policy/terms-use (seul `home` utilise `uniq_id` pour son update,
 * incohérence wire réelle conservée telle quelle, cf. home-update-api.dto.ts).
 *
 * Le DTO source déclarait aussi un champ `order: number` requis, jamais
 * peuplé par le mapper source (`SlideUpdateProps` ne porte même pas de
 * valeur `order`) — code mort, non reproduit ici (cf. bilan de recherche).
 */
export interface SlideUpdateApiDto {
    id: string;
    time_duration_in_seconds: number;
    type: string;
    image_file?: File | string | null;
    video_url?: string | null;
    platforms: string[];
    start_date: string;
    end_date: string;
    title: string;
    subtitle?: string;
    content?: string;
    button_label?: string;
    button_url?: string;
}
