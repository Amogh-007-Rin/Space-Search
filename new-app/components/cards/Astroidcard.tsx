type astroidCardData = {
    id: number;
    name: string;
    velocity: number;
    missDistance: number;
    magnitude: number;
}

interface astroidCardProps {
    data: astroidCardData[]
}


export default function Astroidcard({ data }: astroidCardProps) {
    return (
        <div style={{ overflowX: 'auto' }}> {/* Makes the table responsive on mobile */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #ccc' }}>
                        <th style={{ padding: '10px' }}>ID</th>
                        <th style={{ padding: '10px' }}>NAME</th>
                        <th style={{ padding: '10px' }}>VELOCITY</th>
                        <th style={{ padding: '10px' }}>MISS DISTANCE</th>
                        <th style={{ padding: '10px' }}>MAGNITUDE</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((value, key) => (
                        <tr key={key} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '10px' }}>{value.id}</td>
                            <td style={{ padding: '10px' }}>{value.name}</td>
                            <td style={{ padding: '10px' }}>{value.velocity}</td>
                            <td style={{ padding: '10px' }}>{value.missDistance}</td>
                            <td style={{ padding: '10px' }}>{value.magnitude}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};