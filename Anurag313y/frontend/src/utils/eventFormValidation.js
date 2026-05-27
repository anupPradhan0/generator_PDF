const MOBILE_REGEX = /^[6-9]\d{9}$/;

export const normalizeMobile = (value) => value.replace(/\D/g, '');

export const validateEventForm = (form) => {
  const errors = {};

  const customerName = form.customerName?.trim() || '';
  if (!customerName) {
    errors.customerName = 'Customer name is required';
  } else if (customerName.length < 2) {
    errors.customerName = 'Name must be at least 2 characters';
  } else if (!/^[a-zA-Z\s.'-]+$/.test(customerName)) {
    errors.customerName = 'Name can only contain letters and spaces';
  }

  const mobileNo = normalizeMobile(form.mobileNo || '');
  if (!mobileNo) {
    errors.mobileNo = 'Mobile number is required';
  } else if (mobileNo.length !== 10) {
    errors.mobileNo = 'Mobile number must be 10 digits';
  } else if (!MOBILE_REGEX.test(mobileNo)) {
    errors.mobileNo = 'Enter a valid Indian mobile number (starts with 6–9)';
  }

  const eventName = form.eventName?.trim() || '';
  if (!eventName) {
    errors.eventName = 'Event name is required';
  } else if (eventName.length < 2) {
    errors.eventName = 'Event name must be at least 2 characters';
  }

  if (!form.eventDate) {
    errors.eventDate = 'Event date is required';
  } else {
    const selected = new Date(form.eventDate);
    selected.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(selected.getTime())) {
      errors.eventDate = 'Invalid event date';
    } else if (selected < today) {
      errors.eventDate = 'Event date cannot be before today';
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
};

export const validateEventField = (name, value, form = {}) => {
  return validateEventForm({ ...form, [name]: value }).errors[name] || '';
};
