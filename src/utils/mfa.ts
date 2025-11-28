// src/utils/mfa.ts

// Allowed chars for random part
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789"; // avoid 0/1 for clarity

export function generateReadableKey(email: string): string {
  // prefix from email (just 4 chars, safe fallback)
  const emailPart = email.split("@")[0] || "USER";
  const prefix = emailPart
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .padEnd(4, "X")
    .slice(0, 4);

  // random 12 chars
  const randomChars: string[] = [];
  const randomValues = new Uint32Array(12);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < randomValues.length; i++) {
    const idx = randomValues[i] % CHARSET.length;
    randomChars.push(CHARSET[idx]);
  }

  const key = (prefix + randomChars.join("")).slice(0, 16);
  return key;
}
