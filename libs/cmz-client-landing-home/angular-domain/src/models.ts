export type ListQueryNoInput = Readonly<Record<string, unknown>>;

export interface HomeBlockInfo {
    readonly id: number;
    readonly title: string;
    readonly slug: string;
    readonly resume: string;
    readonly content: string;
    readonly type: string;
    readonly image_url: string;
    readonly video_url: string;
    readonly button_label: string;
    readonly button_url: string;
    readonly updated_at: string;
}
