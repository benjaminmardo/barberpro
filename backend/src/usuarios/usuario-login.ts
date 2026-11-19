export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeUsername(usuario: string) {
  return usuario.trim().toLowerCase();
}

export function emailForUsername(usuario: string) {
  return normalizeUsername(usuario) + '@barberpro.example';
}
