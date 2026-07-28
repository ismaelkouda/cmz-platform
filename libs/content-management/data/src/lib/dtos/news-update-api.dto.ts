export interface NewsUpdateApiDto {
    id: string;
    type: string;
    image_file?: File | string | null;
    video_url?: string | null;
    category_id: string;
    sub_category_id?: string;
    hashtags?: string[];
    title: string;
    resume: string;
    content: string;
}
