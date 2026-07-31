import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#2C2C2C] text-white/50 py-10 px-5">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
              Khatm al-Quran
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link to="/" className="text-white/50 hover:text-white transition-colors no-underline">Home</Link>
            <Link to="/khatam" className="text-white/50 hover:text-white transition-colors no-underline">Tracker</Link>
            <Link to="/metrics" className="text-white/50 hover:text-white transition-colors no-underline">Metrics</Link>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1">
            <p className="text-xs text-white/30 text-center md:text-right">
              A community Quran completion tracker
            </p>
            <p className="text-xs text-white/25 text-center md:text-right">
              Made with ❤️ by{" "}
              <a href="https://ssraza.com" target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors duration-200 underline underline-offset-2">
                Shahrukh
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
