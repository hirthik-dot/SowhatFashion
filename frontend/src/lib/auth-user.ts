/** Normalize API user payload for Zustand (handles id/_id and missing name). */
export function normalizeAuthUser(raw: Record<string, unknown> | null | undefined): {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  savedAddresses?: unknown[];
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ?? raw._id;
  if (id == null) return null;
  const email = typeof raw.email === 'string' ? raw.email : '';
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim()
      : email.split('@')[0] || 'Customer';
  return {
    id: String(id),
    name,
    email,
    ...(typeof raw.avatar === 'string' && raw.avatar ? { avatar: raw.avatar } : {}),
    ...(typeof raw.phone === 'string' ? { phone: raw.phone } : {}),
    ...(typeof raw.dob === 'string' ? { dob: raw.dob } : {}),
    ...(typeof raw.gender === 'string' ? { gender: raw.gender } : {}),
    ...(Array.isArray(raw.savedAddresses) ? { savedAddresses: raw.savedAddresses } : {}),
  };
}

export function userInitials(user: { name?: string; email?: string }): string {
  const n = (user.name || '').trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const local = (user.email || '').split('@')[0] || '?';
  return local.slice(0, 2).toUpperCase();
}

export function userFirstName(user: { name?: string; email?: string }): string {
  const n = (user.name || '').trim();
  if (n) return n.split(/\s+/)[0];
  return (user.email || '').split('@')[0] || 'there';
}
