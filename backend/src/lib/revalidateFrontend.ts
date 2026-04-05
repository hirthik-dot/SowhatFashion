export async function triggerRevalidate(paths: string[]): Promise<void> {
  const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
  const frontendUrl = raw.split(',')[0].trim();
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || paths.length === 0) return;

  for (const path of paths) {
    try {
      const url = `${frontendUrl}/api/revalidate?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent(path)}`;
      await fetch(url);
    } catch (e) {
      console.error('Revalidation failed for', path, e);
    }
  }
}
