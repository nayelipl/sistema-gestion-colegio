"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface NavBarProps {
  titulo: string;
  icono?: string;
  userName?: string | null;
}

export default function NavBar({ titulo, icono = "🏫", userName }: NavBarProps) {
  return (
    <nav style={s.nav}>
      <Link href="/dashboard" style={s.navBack}>← Dashboard</Link>
      <span style={s.navTitle}>{icono} {titulo}</span>
      <div style={s.navRight}>
        {userName && <span style={s.navUser}>👤 {userName}</span>}
        <button onClick={() => signOut({ callbackUrl: "/login" })} style={s.btnLogout}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}

const s: Record<string, React.CSSProperties> = {
  nav:       { background: "linear-gradient(135deg,#2C1810,#4a2518)", color: "#fff", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" },
  navBack:   { color: "#fff", textDecoration: "none", fontSize: "14px", whiteSpace: "nowrap" },
  navTitle:  { fontWeight: "bold", fontSize: "16px", flex: 1, textAlign: "center" },
  navRight:  { display: "flex", alignItems: "center", gap: "12px" },
  navUser:   { fontSize: "13px", opacity: 0.9, whiteSpace: "nowrap" },
  btnLogout: { background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" },
};
