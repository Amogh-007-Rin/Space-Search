'use client'
import useAstroidData from "@/hooks/useAstroidData";

export default function Astroidcard() {

    const { data, loading, error } = useAstroidData();

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading asteroid data...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>Error: {error}</div>;
    }

    if (!data || data.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>No asteroids found.</div>;
    }

    return (
        <div style={{ overflowX: 'auto' }}> {/* Makes the table responsive on mobile */}
            <table>
                <thead>
                    <tr className="">
                        <th className="">ID</th>
                        <th className="">NAME</th>
                        <th className="">VELOCITY</th>
                        <th className="">MISS DISTANCE</th>
                        <th className="">MAGNITUDE</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((value) => (
                        <tr key={value.id} className="">
                            <td className="">{value.id}</td>
                            <td className="">{value.name}</td>
                            <td className="">{value.velocity}</td>
                            <td className="">{value.missDistance}</td>
                            <td className="">{value.magnitude}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};