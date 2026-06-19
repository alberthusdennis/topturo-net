/**
 * Token Manager — satu-satunya tempat yang membaca/menulis token.
 * Tidak ada dependency ke module lain agar tidak ada circular import.
 */
const TOKEN_KEY = 'el_matadore_jwt';

export const tokenManager = {
  get: (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (token: string): void => {
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
  },
  clear: (): void => {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  },
};
