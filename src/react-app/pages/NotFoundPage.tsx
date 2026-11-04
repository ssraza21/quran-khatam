import { Link } from "react-router-dom";
import { btn } from "@/lib/ui";

interface NotFoundPageProps {
  title?: string;
  message?: string;
}

export default function NotFoundPage({
  title = "Page not found",
  message = "The link may be mistyped, or the khatam may have been deleted.",
}: NotFoundPageProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-2xl font-semibold text-stone-900">{title}</h1>
      <p className="mt-2 text-[15px] text-stone-600">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/campaigns" className={btn("primary", "md")}>Find a khatam</Link>
        <Link to="/" className={btn("secondary", "md")}>Home</Link>
      </div>
    </div>
  );
}
