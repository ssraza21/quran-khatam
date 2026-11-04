import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { buildWhatsAppKhatamMessage } from "@/lib/helpers";
import type { Slot } from "@/lib/types";
import { btn } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface ShareDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  slug: string;
  /** Path under the site to share. Defaults to the campaign page. */
  path?: string;
  /** When given, the WhatsApp message lists who has each Juz. */
  slots?: Slot[];
  /** Personal khatams: only the link, with a privacy note. */
  isPrivate?: boolean;
}

export default function ShareDrawer({ open, onClose, title, slug, path, slots, isPrivate }: ShareDrawerProps) {
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const url = `${window.location.origin}${path ?? `/k/${slug}`}`;
  const message = slots && slots.length > 0
    ? buildWhatsAppKhatamMessage(title, slug, slots)
    : `*${title}*\nPick a part of the Quran to read:\n${url}`;

  const copy = (text: string, kind: "link" | "message") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => toast.error("Couldn't copy. Select the text and copy it manually."));
  };

  return (
    <Drawer open={open} onOpenChange={o => !o && onClose()}>
      <DrawerContent className="mx-auto max-h-[90vh] max-w-lg">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-heading text-xl font-semibold text-stone-900">
            {isPrivate ? "Your private link" : "Invite people"}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-stone-600">
            {isPrivate
              ? "Bookmark this link to come back. Anyone who has it can update your progress."
              : "Anyone with the link can claim a part and mark it done."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-5 overflow-y-auto px-4 pb-8">
          <div className="flex items-center gap-2 rounded-lg border border-stone-300 bg-stone-50 py-1.5 pl-3 pr-1.5">
            <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{url.replace(/^https?:\/\//, "")}</span>
            <button type="button" onClick={() => copy(url, "link")} className={btn("primary", "sm")}>
              {copied === "link" ? <Check size={15} /> : <Copy size={15} />}
              {copied === "link" ? "Copied" : "Copy"}
            </button>
          </div>

          {!isPrivate && (
            <div>
              <p className="mb-2 text-sm font-medium text-stone-700">Message for a group chat</p>
              <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-stone-200 bg-stone-50 p-3 font-sans text-xs leading-relaxed text-stone-700">
                {message}
              </pre>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => copy(message, "message")} className={btn("secondary", "md")}>
                  {copied === "message" ? "Copied" : "Copy message"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(btn("primary", "md"), "bg-[#1DA851] hover:bg-[#178F44]")}
                >
                  Send on WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
