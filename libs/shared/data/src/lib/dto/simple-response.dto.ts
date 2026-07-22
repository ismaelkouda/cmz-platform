export interface Paginate<T> {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: Link[];
    next_page_url: string;
    path: string;
    per_page: number;
    prev_page_url: string;
    to: number;
    total: number;
}

export interface Link {
    url: string;
    label: string;
    active: boolean;
}

export interface PaginatedResponseDto<T> {
    error: boolean;
    message: string;
    data: Paginate<T>;
}

export interface SimpleResponseDto<T> {
    error: boolean;
    message: string;
    data: T;
}

export interface MessageResponseDto {
    error: boolean;
    message: string;
}
