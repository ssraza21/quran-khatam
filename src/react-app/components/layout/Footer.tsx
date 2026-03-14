import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#2C2C2C] text-white/50 py-10 px-5">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#8B0000] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold" style={{ fontFamily: "'Amiri', serif" }}>ق</span>
            </div>
            <span className="text-white/70 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
              Khatm al-Quran
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link to="/" className="text-white/50 hover:text-white transition-colors no-underline">Home</Link>
            <Link to="/khatam" className="text-white/50 hover:text-white transition-colors no-underline">Tracker</Link>
            <Link to="/metrics" className="text-white/50 hover:text-white transition-colors no-underline">Metrics</Link>
          </div>

          <p className="text-xs text-white/30 text-center md:text-right">
            A community Quran completion tracker
          </p>
        </div>
      </div>
    </footer>
  );
}
