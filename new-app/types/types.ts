export type astroidCardData = {
    id: number;
    name: string;
    velocity: number;
    missDistance: number;
    magnitude: number;
};

export type NeoApiRecord = {
    id: number;
    name: string;
    relative_velocity: number;
    miss_distance: number;
    absolute_magnitude: number;
};

export type NeoApiResponse = {
    data: NeoApiRecord[];
};