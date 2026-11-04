import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { btn } from "@/lib/ui";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Create it and share the link",
    desc: "Name your khatam and send the link to your family, friends or community — over WhatsApp or anywhere else.",
  },
  {
    title: "Everyone picks a part",
    desc: "The Quran is divided into 30 Juz, each split into 4 quarters. People claim a whole Juz or a single quarter.",
  },
  {
    title: "Mark it done when finished",
    desc: "Progress updates live for everyone. When all 120 quarters are done, the khatam is complete.",
  },
];

export default function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Old links pointed at sections of this page.
  useEffect(() => {
    if (location.hash === "#create-khatam") navigate("/new", { replace: true });
    if (location.hash === "#join-khatam") navigate("/campaigns", { replace: true });
  }, [location.hash, navigate]);

  return (
    <>
      <section className="bg-primary text-white">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:py-24">
          <h1 className="font-heading text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Complete the Quran together
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Divide the Quran among your family, friends or community, and see every part get read until the khatam is complete.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/new" className={cn(btn("secondary", "lg"), "border-white bg-white text-primary hover:bg-stone-100")}>
              Start a khatam
            </Link>
            <Link to="/campaigns" className={cn(btn("ghost", "lg"), "border border-white/40 text-white hover:bg-white/10 hover:text-white")}>
              Find a khatam to join
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="font-heading text-2xl font-semibold text-stone-900 sm:text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 sm:block">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="sm:mt-4">
                  <h3 className="text-base font-semibold text-stone-900">{step.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-stone-600">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-14 sm:grid-cols-2 sm:px-6 sm:py-20">
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">For a group</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-stone-600">
            For a family, mosque, class or a dedication for someone who has passed away. You keep an admin PIN to
            assign parts, fix names and start the next khatam.
          </p>
          <Link to="/new" className={cn(btn("primary", "md"), "mt-5")}>Start a group khatam</Link>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">Just for yourself</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-stone-600">
            A private checklist of all 120 quarters. Tick off what you've read and pick up where you left off.
          </p>
          <Link to="/new?mode=personal" className={cn(btn("secondary", "md"), "mt-5")}>Start a personal khatam</Link>
        </div>
      </section>
    </>
  );
}
