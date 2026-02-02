export interface Ride {
    id: string;
    _id?: string;
    name: string;
    price: number;
    image?: string;
    description?: string;
}

export const rides: Ride[] = [];
