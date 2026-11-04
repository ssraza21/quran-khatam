const DOTS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4 - Math.PI / 2;
  return { cx: 16 + 9.5 * Math.cos(a), cy: 16 + 9.5 * Math.sin(a) };
});

/** "Gathering" mark: eight readers in a circle around an open book. Also used as public/favicon.svg. */
export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" fill="#8B0000" />
      <g fill="#F7EBDD">
        {DOTS.map(d => (
          <circle key={`${d.cx}-${d.cy}`} cx={d.cx} cy={d.cy} r="2.3" />
        ))}
        <path d="M11.5 14 C13.5 13.3 15 13.7 16 15 C17 13.7 18.5 13.3 20.5 14 V19 C18.5 18.3 17 18.7 16 20 C15 18.7 13.5 18.3 11.5 19 Z" />
      </g>
    </svg>
  );
}
