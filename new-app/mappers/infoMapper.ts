import useAstroidStats from "@/hooks/useAstroidStats";

export default function useInfoCardDataMapper(){
    const {data, loading, error} = useAstroidStats();

    const mappedData = data.map((value) => ({
        totalRecord: value.totalRecord,
        hazardousCount: value.hazardousCount,
        safeCount: value.safeCount,
        velocityAvgKmph: value.velocityAvgKmph,
        velocityMaxKmph: value.velocityMaxKmph,
        missDistanceMinKm: value.missDistanceMinKm,}));

    return {mappedData, loading, error};
}