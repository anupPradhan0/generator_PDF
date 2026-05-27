export const generateReferenceNumber = async (userId, Invoice) => {
  const count = await Invoice.countDocuments({ user: userId });
  const seq = String(count + 1).padStart(4, '0');
  const year = new Date().getFullYear();
  return `EVT-${year}-${seq}`;
};

export const normalizeMobileNo = (mobile) => mobile.replace(/\s+/g, '').trim();
