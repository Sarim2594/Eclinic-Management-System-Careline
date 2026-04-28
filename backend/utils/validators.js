function requireFields(payload, fields) {
  const missing = fields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

function assertEmail(value, fieldName = 'email') {
  if (!value) return;
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (!valid) {
    const error = new Error(`${fieldName} must be a valid email address`);
    error.status = 400;
    throw error;
  }
}

function assertPhone(value, fieldName = 'contact') {
  if (!value) return;
  const digits = String(value).replace(/\D/g, '');
  const valid = /^(03\d{9}|92\d{10})$/.test(digits);
  if (!valid) {
    const error = new Error(`${fieldName} must be a valid phone number`);
    error.status = 400;
    throw error;
  }
}

function assertCnic(value, fieldName = 'cnic') {
  if (!value) return;
  const valid = /^\d{5}-\d{7}-\d$/.test(String(value)) || /^\d{13}$/.test(String(value));
  if (!valid) {
    const error = new Error(`${fieldName} must be in the format xxxxx-xxxxxxx-x`);
    error.status = 400;
    throw error;
  }
}

function assertInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') return;
  if (!Number.isInteger(Number(value))) {
    const error = new Error(`${fieldName} must be an integer`);
    error.status = 400;
    throw error;
  }
}

module.exports = { requireFields, assertEmail, assertPhone, assertCnic, assertInteger };
