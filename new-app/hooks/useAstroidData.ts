import { BACKEND_URL } from "@/api/config";
import axios from "axios";
import { useEffect, useState } from "react";
import { astroidCardData, NeoApiResponse } from "@/types/types";

export default function useAstroidData() {
    const [data, setData] = useState<astroidCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<null | string>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await axios.get<NeoApiResponse>(`${BACKEND_URL}/neo/info/all?limit=5`);

                if (!Array.isArray(response.data?.data)) {
                    setError("Unexpected response from server");
                    setData([]);
                } else {
                    const normalized = response.data.data.map((value) => ({
                        id: value.id,
                        name: value.name,
                        velocity: value.relative_velocity,
                        missDistance: value.miss_distance,
                        magnitude: value.absolute_magnitude,
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

// Custom Hooks Cannot Be Async Functions.