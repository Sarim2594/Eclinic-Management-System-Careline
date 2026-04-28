export default function InlineErrors({ errors }) {
  const entries = Object.values(errors || {}).filter(Boolean);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-[#CC2229]/20 bg-[#CC2229]/5 p-3 text-sm text-[#CC2229]">
      {entries.map((error) => (
        <p key={error}>{error}</p>
      ))}
    </div>
  );
}
