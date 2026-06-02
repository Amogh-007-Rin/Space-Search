export type astroidCardData = {
    id: number;
    name: string;
    velocity: number;
    missDistance: number;
    magnitude: number;
};

export type infocardData = {
    totalRecord: number;
    hazardousCount: number;
    safeCount: number;
    velocityAvgKmph: number;        
    velocityMaxKmph: number;
    missDistanceMinKm: number;
    missDistanceAvgKm: number;
    diameterMinAvgKm: number;
    diameterMaxAvgKm: number;
    absoluteMagnitudeAvg: number;

}

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


export type NEOStats = {
  total_records: number;
  hazardous_count: number;
  safe_count: number;
  hazardous_percentage: number;
  velocity_avg_kmph: number;
  velocity_max_kmph: number;
  miss_distance_avg_km: number;
  miss_distance_min_km: number;
  diameter_min_avg_km: number;
  diameter_max_avg_km: number;
  absolute_magnitude_avg: number;
}

export type NEOStatsResponse = {
    data: NEOStats[]
}
