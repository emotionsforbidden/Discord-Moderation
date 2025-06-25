export interface IPage<T> {
    sliced: T[];
    checkForNextPage: boolean;
    pagesCount: number;
    from: number;
}
