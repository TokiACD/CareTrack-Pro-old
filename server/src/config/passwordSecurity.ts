/**
 * Enhanced Password Reset Security
 * Cryptographically secure token generation for HIPAA compliance
 */

import crypto from 'crypto';
import { promisify } from 'util';

const randomBytesAsync = promisify(crypto.randomBytes);

export interface PasswordResetTokenData {
  token: string;
  hashedToken: string;
  expiresAt: Date;
}

/**
 * Generate cryptographically secure password reset token
 * Uses crypto.randomBytes for true randomness, not pseudo-random
 */
export async function generateSecurePasswordResetToken(): Promise<PasswordResetTokenData> {
  try {
    // Generate 32 bytes of cryptographically secure random data
    const tokenBytes = await randomBytesAsync(32);
    const token = tokenBytes.toString('hex'); // 64-character hex string
    
    // Create a hash of the token for database storage
    // This prevents rainbow table attacks even if database is compromised
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Token expires in 15 minutes for security
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    return {
      token, // Send this to user via email
      hashedToken, // Store this in database
      expiresAt
    };
  } catch (error) {
    console.error('Failed to generate secure password reset token:', error);
    throw new Error('Failed to generate secure token');
  }
}

/**
 * Verify password reset token against stored hash
 * Uses constant-time comparison to prevent timing attacks
 */
export function verifyPasswordResetToken(providedToken: string, storedHashedToken: string): boolean {
  try {
    const providedTokenHash = crypto.createHash('sha256').update(providedToken).digest('hex');
    
    // Use crypto.timingSafeEqual for constant-time comparison
    // Prevents timing attacks that could reveal token information
    const providedBuffer = Buffer.from(providedTokenHash, 'hex');
    const storedBuffer = Buffer.from(storedHashedToken, 'hex');
    
    if (providedBuffer.length !== storedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(providedBuffer, storedBuffer);
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

/**
 * Generate secure session token for additional authentication layers
 */
export async function generateSecureSessionToken(): Promise<string> {
  try {
    const tokenBytes = await randomBytesAsync(24);
    return tokenBytes.toString('base64url'); // URL-safe base64
  } catch (error) {
    console.error('Failed to generate session token:', error);
    throw new Error('Failed to generate session token');
  }
}

/**
 * Generate secure API key for system integrations
 */
export async function generateSecureApiKey(): Promise<string> {
  try {
    const keyBytes = await randomBytesAsync(32);
    const timestamp = Date.now().toString(36);
    return `ctpro_${timestamp}_${keyBytes.toString('base64url')}`;
  } catch (error) {
    console.error('Failed to generate API key:', error);
    throw new Error('Failed to generate API key');
  }
}

/**
 * Validate password strength according to healthcare standards
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Length checks
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  } else if (password.length >= 12) {
    score += 1;
  }

  if (password.length >= 16) {
    score += 1;
  }

  // Character type checks
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Advanced checks
  if (password.length > 20) {
    score += 1;
  }

  // Check for common patterns
  const commonPatterns = [
    /123456/, /password/, /qwerty/, /admin/, /letmein/,
    /welcome/, /monkey/, /dragon/, /master/, /trustno1/,
    /healthcare/, /hospital/, /medical/, /patient/, /doctor/
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password.toLowerCase())) {
      errors.push('Password contains common words or patterns');
      score = Math.max(0, score - 2);
      break;
    }
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters');
    score = Math.max(0, score - 1);
  }

  // Determine strength
  let strength: PasswordValidationResult['strength'];
  if (score >= 6) {
    strength = 'very_strong';
  } else if (score >= 5) {
    strength = 'strong';
  } else if (score >= 3) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  return {
    isValid: errors.length === 0 && score >= 4,
    errors,
    strength
  };
}