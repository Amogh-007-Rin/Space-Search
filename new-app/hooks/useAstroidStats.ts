import { BACKEND_URL } from "@/api/config";
import { infocardData, NEOStatsResponse } from "@/types/types";
import axios from "axios";
import { useEffect, useState } from "react";

export default function useAstroidStats() {
    
    
    const [data, setData] = useState<infocardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<null | string>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await axios.get<NEOStatsResponse>(`${BACKEND_URL}/neo/info/all?limit=6`);

                if (!Array.isArray(response.data?.data)) {
                    setError("Unexpected response from server");
                    setData([]);
                } else {
                    const normalized = response.data.data.map((value) => ({
                        totalRecord: value.total_records,
                        hazardousCount: value.hazardous_count,
                        safeCount: value.safe_count,
                        velocityAvgKmph: value.velocity_avg_kmph,
                        velocityMaxKmph: value.velocity_max_kmph,
                        missDistanceMinKm: value.miss_distance_min_km,
                        missDistanceAvgKm: value.miss_distance_avg_km,
                        diameterMinAvgKm: value.diameter_min_avg_km,
                        diameterMaxAvgKm: value.diameter_max_avg_km,
                        absoluteMagnitudeAvg: value.absolute_magnitude_avg,
                    }));
                    setData(normalized);
                    setError(null);
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "An unexpected error occurred";
                setError(message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};
