'use client'
import useAstroidData from "@/hooks/useAstroidData";

export default function Astroidcard() {

    const { data, loading, error } = useAstroidData();

    if (loading) {
        return <div className="p-5 text-center">Loading asteroid data...</div>;
    }

    if (error) {
        return <div className="p-5 text-center text-red-500">Error: {error}</div>;
    }

    if (!data || data.length === 0) {
        return <div className="p-5 text-center">No asteroids found.</div>;
    }

    return (
        <>
            <div className="w-full h-full overflow-hidden rounded-2xl bg-[#100F15]">
                <div className="w-full bg-[#100F15] p-6 h-[10%] flex items-center justify-start">
                    <h4 className="tracking-wider">RECENT HAZARDOUS OBJECTS</h4>
                </div>
                <table className="w-full h-[87%] border-collapse text-[13px] bg-[#100F15] ">
                    <thead className="bg-[#1F1D28]">
                        <tr>
                            {["ID", "Name", "Velocity (km/h)", "Miss Distance (km)", "Magnitude"].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((value) => (
                            <tr key={value.id} className="border-b border-[rgba(30,41,59,.6)]">
                                <td className="px-4 py-2.75 font-mono text-slate-400">{value.id}</td>
                                <td className="px-4 py-2.75 font-medium text-slate-200">{value.name}</td>
                                <td className="px-4 py-2.75 text-[#fb923c]">{value.velocity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td className="px-4 py-2.75 text-slate-400">{value.missDistance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td className="px-4 py-2.75 text-slate-400">{value.magnitude}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};