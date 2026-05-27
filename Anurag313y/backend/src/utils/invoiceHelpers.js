export const generateReferenceNumber = async (userId, Invoice) => {
  const count = await Invoice.countDocuments({ user: userId });
  const seq = String(count + 1).padStart(4, '0');
  const year = new Date().getFullYear();
  return `EVT-${year}-${seq}`;
};

export const normalizeMobileNo = (mobile) => mobile.replace(/\s+/g, '').trim();

export const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const isEventDateOnOrAfterToday = (dateInput) => {
  const eventDate = new Date(dateInput);
  if (Number.isNaN(eventDate.getTime())) return false;
  eventDate.setHours(0, 0, 0, 0);
  return eventDate >= getStartOfToday();
};

const MOBILE_REGEX = /^[6-9]\d{9}$/;

export const validateEventPayload = ({ customerName, mobileNo, eventName, eventDate }) => {
  const errors = {};

  const name = customerName?.trim() || '';
  if (!name) {
    errors.customerName = 'Customer name is required';
  } else if (name.length < 2) {
    errors.customerName = 'Name must be at least 2 characters';
  } else if (!/^[a-zA-Z\s.'-]+$/.test(name)) {
    errors.customerName = 'Name can only contain letters and spaces';
  }

  const mobile = normalizeMobileNo(mobileNo || '');
  if (!mobile) {
    errors.mobileNo = 'Mobile number is required';
  } else if (!MOBILE_REGEX.test(mobile)) {
    errors.mobileNo = 'Enter a valid 10-digit Indian mobile number';
  }

  const event = eventName?.trim() || '';
  if (!event) {
    errors.eventName = 'Event name is required';
  } else if (event.length < 2) {
    errors.eventName = 'Event name must be at least 2 characters';
  }

  if (!eventDate) {
    errors.eventDate = 'Event date is required';
  } else if (Number.isNaN(new Date(eventDate).getTime())) {
    errors.eventDate = 'Invalid event date';
  } else if (!isEventDateOnOrAfterToday(eventDate)) {
    errors.eventDate = 'Event date cannot be before today';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    normalized: {
      customerName: name,
      mobileNo: mobile,
      eventName: event,
      eventDate: eventDate ? new Date(eventDate) : null,
    },
  };
};
