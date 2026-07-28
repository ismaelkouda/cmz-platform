/**
 * Seule entité du module dont le DTO update utilise `uniq_id` comme
 * identifiant (les autres — slide/news/legal-notice/privacy-policy/terms-use —
 * utilisent `id`) : incohérence de nommage wire réelle, vérifiée dans le
 * source, conservée telle quelle (fidélité au contrat réel, pas une
 * simplification).
 */
export interface HomeUpdateApiDto {
    uniq_id: string;
    image_file: File | string;
    platforms: string[];
    start_date: string;
    end_date: string;
    title: string;
    resume: string;
    content: string;
    button_label?: string;
    button_url?: string;
}
