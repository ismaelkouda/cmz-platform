export interface ResourceState<TData, TFilter> {
    filter: TFilter | null;
    data: TData | null;
    loading: boolean;
    error: unknown;
    lastFetch: number;
}
