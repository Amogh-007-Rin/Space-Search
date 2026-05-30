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

    console.log(data)
    console.log(loading)
    console.log(error)
    return (
        <div style={{ overflowX: 'auto' }}> {/* Makes the table responsive on mobile */}
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>NAME</th>
                        <th>VELOCITY</th>
                        <th>MISS DISTANCE</th>
                        <th>MAGNITUDE</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((value) => (
                        <tr key={value.id}>
                            <td>{value.id}</td>
                            <td>{value.name}</td>
                            <td>{value.velocity}</td>
                            <td>{value.missDistance}</td>
                            <td>{value.magnitude}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};