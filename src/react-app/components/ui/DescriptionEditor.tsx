import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface DescriptionEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  minRows?: number;
}

/** Plain multi-line text field with a character counter. */
export default function DescriptionEditor({
  id,
  value,
  onChange,
  placeholder,
  maxLength = 500,
  minRows = 5,
}: DescriptionEditorProps) {
  const counterId = `${id}-count`;
  const nearLimit = value.length >= maxLength * 0.9;

  return (
    <div>
      <textarea
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={minRows}
        aria-describedby={counterId}
        className={cn(ui.input, "resize-y leading-relaxed")}
      />
      <p
        id={counterId}
        className={cn("mt-1 text-right text-xs tabular-nums", nearLimit ? "text-stone-700" : "text-stone-400")}
      >
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
