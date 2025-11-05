/**
 * Password Hashing Utilities for Quiz Access Control
 * Uses SHA-256 to generate proof hash for password-protected quizzes
 */

/**
 * Generates SHA-256 hash using Web Crypto API
 * @param message - String to hash
 * @returns Hex string of hash
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generates proof hash for quiz password verification
 * Format: SHA256(salt + ":" + password)
 * 
 * @param salt - Salt from quiz metadata (pwd.salt)
 * @param password - Plain password entered by user
 * @returns Proof hash to compare with pwd.hash
 */
export async function generateProofHash(salt: string, password: string): Promise<string> {
  const combined = `${salt}:${password}`;
  return await sha256(combined);
}

/**
 * Generates random salt for new password-protected quiz
 * @param length - Length of salt in bytes (default 32)
 * @returns Base64-encoded salt
 */
export function generateSalt(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Creates password hash for storing in quiz metadata
 * @param password - Plain password
 * @returns Object with salt and hash
 */
export async function createPasswordHash(password: string): Promise<{ salt: string; hash: string }> {
  const salt = generateSalt();
  const hash = await generateProofHash(salt, password);
  return { salt, hash };
}
