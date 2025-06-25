export interface PaginateDto<T> {
    page?: number;
    items: T[];
    itemsOnPage?: number;
    reverse?: boolean;
}
