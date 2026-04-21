'use client'

export default function RedirectButton() {
  const handleRedirect = () => {
    // Redirects the browser to the specified URL
    window.location.href = 'http://localhost:8080';
  };
  const active = false;
  return (
    <button onClick={handleRedirect} className="cursor-pointer text-center" style={{
        padding: "6px 14px",
        borderRadius: 7,
        fontSize: 13,
        fontWeight: 500,
        textDecoration: "none",
        transition: "all .18s ease",
        color: active ? "#60a5fa" : "#64748b",
        letterSpacing: "0.01em"
      }} >
      Airflow Dashboard
    </button>
  );
}
