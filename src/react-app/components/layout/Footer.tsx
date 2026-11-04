import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Quran Khatam · Complete the Quran together</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/campaigns" className="hover:text-stone-900">Find a khatam</Link>
          <Link to="/new" className="hover:text-stone-900">Start a khatam</Link>
          <Link to="/globe" className="hover:text-stone-900">World map</Link>
          <a href="https://ssraza.com" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900">
            By Shahrukh
          </a>
        </nav>
      </div>
    </footer>
  );
}
