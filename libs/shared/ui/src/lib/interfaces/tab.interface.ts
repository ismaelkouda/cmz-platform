export interface Tab {
    id: string;
    title: string;
    path: string;
    icon?: string | null;
    active: boolean;
    closable: boolean;
}
