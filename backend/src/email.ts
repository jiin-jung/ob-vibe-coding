export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isInuEmail = (email: string) => /^[^\s@]+@inu\.ac\.kr$/.test(normalizeEmail(email));
