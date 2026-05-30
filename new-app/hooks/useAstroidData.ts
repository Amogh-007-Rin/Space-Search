import { BACKEND_URL } from "@/api/config";
import axios from "axios";
import { useEffect, useState } from "react";
import { astroidCardData } from "@/types/types";

type NeoApiRecord = {
    id: number;
    name: string;
    relative_velocity: number;
    miss_distance: number;
    absolute_magnitude: number;
};

type NeoApiResponse = {
    data: NeoApiRecord[];
};


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
                    const normalized = response.data.data.map((record) => ({
                        id: record.id,
                        name: record.name,
                        velocity: record.relative_velocity,
                        missDistance: record.miss_distance,
                        magnitude: record.absolute_magnitude,
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
}

// Custom Hooks Cannot Be Async Functions.