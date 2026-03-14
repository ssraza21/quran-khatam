import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const { pathname } = useLocation();

  const linkClass = (path: string) =>
    `px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
      pathname === path
        ? "bg-[#8B0000] text-white shadow-md"
        : "text-[#4A4A4A] hover:bg-[#8B0000]/10 hover:text-[#8B0000]"
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-5 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3 no-underline group">
          <div className="w-9 h-9 bg-gradient-to-br from-[#8B0000] to-[#5A0000] rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white text-base font-bold" style={{ fontFamily: "'Amiri', serif" }}>ق</span>
          </div>
          <span className="text-lg font-semibold text-[#2C2C2C]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Khatm al-Quran
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/" className={linkClass("/")}>Home</Link>
          <Link to="/khatam" className={linkClass("/khatam")}>Tracker</Link>
          <Link to="/metrics" className={linkClass("/metrics")}>Metrics</Link>
        </div>
      </div>
    </nav>
  );
}
