import { NavLink } from "react-router-dom";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignTabsProps {
  slug: string;
  /** Hide the Overview tab for campaigns that only have a single Khatam (overview redirects to the tracker). */
  hideOverview?: boolean;
  /** Personal khatams have no dashboard or admin. */
  isSolo?: boolean;
}

/**
 * Secondary navigation shared by every page inside a campaign (/k/:slug/*).
 * Sits directly under the PageHeader title.
 */
export default function CampaignTabs({ slug, hideOverview, isSolo }: CampaignTabsProps) {
  if (isSolo) return null;

  const tabs = [
    ...(hideOverview ? [] : [{ to: `/k/${slug}`, label: "Overview", end: true }]),
    { to: `/k/${slug}/tracker`, label: "Tracker", end: true },
    { to: `/k/${slug}/metrics`, label: "Progress", end: true },
  ];

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative inline-flex h-11 shrink-0 items-center gap-1.5 px-1 text-sm font-medium transition-colors",
      isActive
        ? "text-stone-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
        : "text-stone-500 hover:text-stone-900",
    );

  return (
    <nav aria-label="Campaign" className="-mb-5 mt-4 flex items-center gap-5 overflow-x-auto no-scrollbar sm:-mb-6 sm:mt-5">
      {tabs.map(tab => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClass}>
          {tab.label}
        </NavLink>
      ))}
      <NavLink to={`/k/${slug}/admin`} className={args => cn(tabClass(args), "ml-auto")}>
        <Lock size={13} />
        Admin
      </NavLink>
    </nav>
  );
}
