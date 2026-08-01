import { AlignLeft } from "lucide-react";

interface DescriptionEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  minRows?: number;
}

export default function DescriptionEditor({
  id,
  value,
  onChange,
  placeholder,
  maxLength = 500,
  minRows = 5,
}: DescriptionEditorProps) {
  const helpId = `${id}-help`;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow focus-within:border-[#8B0000]/60 focus-within:ring-2 focus-within:ring-[#8B0000]/10">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-[#FAFAF9] px-3 py-2 text-[10px] text-gray-500">
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.12em]">
          <AlignLeft size={12} aria-hidden="true" />
          Text editor
        </span>
        <span id={helpId}>Line breaks are preserved</span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={minRows}
        aria-describedby={helpId}
        className="block min-h-32 w-full resize-y border-0 bg-white px-4 py-3 text-sm leading-6 text-gray-800 outline-none placeholder:text-gray-400"
      />
      <div className="flex items-center justify-between border-t border-gray-100 bg-[#FAFAF9] px-3 py-1.5 text-[10px] text-gray-400">
        <span>Press Enter to start a new line</span>
        <span className="tabular-nums" aria-live="polite">{value.length}/{maxLength}</span>
      </div>
    </div>
  );
}
