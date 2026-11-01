import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FDFDFC",
      color: "#1A2B4C",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "24px",
      textAlign: "center"
    }}>
      <div style={{
        maxWidth: "480px",
        width: "100%",
        backgroundColor: "#FFFFFF",
        padding: "48px 32px",
        borderRadius: "12px",
        border: "1px solid #E5E1DB",
        boxShadow: "0 10px 30px rgba(0,0,0,0.03)"
      }}>
        <span style={{
          display: "inline-block",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#965522",
          marginBottom: "16px"
        }}>
          Error 404
        </span>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "12px", color: "#0A3D5C" }}>
          Página no encontrada
        </h1>
        <p style={{ fontSize: "15px", color: "#6B7280", lineHeight: "1.6", marginBottom: "32px" }}>
          La ruta que intentas consultar no existe o ha sido trasladada a otra ubicación.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            backgroundColor: "#0A3D5C",
            color: "#FFFFFF",
            textDecoration: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 600,
            transition: "all 0.2s ease"
          }}
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
