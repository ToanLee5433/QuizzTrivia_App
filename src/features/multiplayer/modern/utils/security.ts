/**
 * Security utilities for Modern Multiplayer
 * Handles password hashing, sanitization, and validation
 */

import CryptoJS from 'crypto-js';

// Salt for password hashing - In production, should be from env variable
const SALT = import.meta.env.VITE_PASSWORD_SALT || 'QuizTrivia_Multiplayer_Salt_2025';

/**
 * Hash a password using SHA256 with salt
 * @param password - Plain text password
 * @returns Hashed password string
 */
export function hashPassword(password: string): string {
  if (!password) {
    throw new Error('Password cannot be empty');
  }
  
  return CryptoJS.SHA256(password + SALT).toString();
}

/**
 * Verify a password against a stored hash
 * @param password - Plain text password to verify
 * @param hash - Stored hash to compare against
 * @returns True if password matches
 */
export function verifyPassword(password: string, hash: string): boolean {
  if (!password || !hash) {
    return false;
  }
  
  const inputHash = hashPassword(password);
  
  // Timing-safe comparison to prevent timing attacks
  return timingSafeEqual(inputHash, hash);
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by ensuring comparison takes constant time
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid and error message
 */
export function validatePasswordStrength(password: string): { 
  isValid: boolean; 
  error?: string 
} {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 4) {
    return { isValid: false, error: 'Password must be at least 4 characters' };
  }
  
  if (password.length > 50) {
    return { isValid: false, error: 'Password must be less than 50 characters' };
  }
  
  return { isValid: true };
}

/**
 * Validate room name
 * @param name - Room name to validate
 * @returns Object with isValid and error message
 */
export function validateRoomName(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Room name is required' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Room name must be at least 3 characters' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Room name must be less than 50 characters' };
  }
  
  // Check for invalid characters
  const invalidChars = /[<>'"]/;
  if (invalidChars.test(trimmed)) {
    return { isValid: false, error: 'Room name contains invalid characters' };
  }
  
  return { isValid: true };
}

/**
 * Validate max players setting
 * @param maxPlayers - Number of max players
 * @returns Object with isValid and error message
 */
export function validateMaxPlayers(maxPlayers: number): {
  isValid: boolean;
  error?: string;
} {
  if (!Number.isInteger(maxPlayers)) {
    return { isValid: false, error: 'Max players must be a number' };
  }
  
  if (maxPlayers < 2) {
    return { isValid: false, error: 'Max players must be at least 2' };
  }
  
  if (maxPlayers > 20) {
    return { isValid: false, error: 'Max players cannot exceed 20' };
  }
  
  return { isValid: true };
}
