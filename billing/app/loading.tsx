export default function Loading() {
  return (
    <main className="min-h-screen p-4 space-y-3">
      <div className="h-10 w-60 rounded bg-[var(--surface)] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded bg-[var(--surface)] animate-pulse" />
        ))}
      </div>
      <div className="h-72 rounded bg-[var(--surface)] animate-pulse" />
      <div className="h-72 rounded bg-[var(--surface)] animate-pulse" />
    </main>
  );
}
