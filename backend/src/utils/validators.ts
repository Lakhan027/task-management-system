// src/utils/validators.ts

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

interface RegisterData {
  name?: string;
  email?: string;
  password?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate registration data
 */
export const validateRegister = (data: RegisterData): ValidationResult => {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || !isStrongPassword(data.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase and number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

interface LoginData {
  email?: string;
  password?: string;
}

/**
 * Validate login data
 */
export const validateLogin = (data: LoginData): ValidationResult => {
  const errors: string[] = [];

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || data.password.length < 1) {
    errors.push('Password is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
