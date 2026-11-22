export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" width={size} height={size} alt="" />
      <span className="text-lg font-bold tracking-tight">Hustle<span className="text-brand">Hub</span></span>
    </div>
  );
}
