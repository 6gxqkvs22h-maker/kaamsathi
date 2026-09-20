export default function Stars({
  value,
  size = "text-sm",
}: {
  value: number;
  size?: string;
}) {
  const full = Math.round(value);
  return (
    <span className={`${size} tracking-tight text-amber-400`}>
      {"★".repeat(full)}
      <span className="text-slate-600">{"★".repeat(5 - full)}</span>
    </span>
  );
}
