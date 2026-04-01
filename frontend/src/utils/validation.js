// ============================================================================
// VALIDATION UTILITIES
// Replaces: static/validation_functions.js
// ============================================================================

export const validateCNIC = (cnic) => /^\d{5}-\d{7}-\d$/.test(cnic);
export const validateContact = (contact) => /^\+92\d{10}$/.test(contact);
export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validatePassword = (password) => password && password.length >= 6;
export const required = (value) => value !== undefined && value !== null && value !== '';
