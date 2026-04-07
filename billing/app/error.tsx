"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen grid place-items-center p-4">
      <div className="pos-card p-6 max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{error.message}</p>
        <button className="h-11 px-4 rounded bg-[var(--gold)] text-black" onClick={reset}>
          Retry
        </button>
      </div>
    </main>
  );
}
