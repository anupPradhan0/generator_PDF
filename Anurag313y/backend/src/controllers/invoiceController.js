import Invoice from '../models/Invoice.js';
import { generateEventsPDFBuffer } from '../utils/generateEventsPDF.js';
import {
  generateReferenceNumber,
  getStartOfToday,
  validateEventPayload,
} from '../utils/invoiceHelpers.js';

const buildDateRangeQuery = (dateStr) => {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { eventDate: { $gte: start, $lte: end } };
};

const formatInvoice = (invoice) => ({
  id: invoice._id,
  referenceNumber: invoice.referenceNumber,
  customerName: invoice.customerName,
  mobileNo: invoice.mobileNo,
  eventName: invoice.eventName,
  eventDate: invoice.eventDate,
  createdAt: invoice.createdAt,
  updatedAt: invoice.updatedAt,
});

export const getInvoices = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const userFilter = { user: req.user.id };
    const startOfToday = getStartOfToday();

    const [total, upcoming, past, invoices] = await Promise.all([
      Invoice.countDocuments(userFilter),
      Invoice.countDocuments({ ...userFilter, eventDate: { $gte: startOfToday } }),
      Invoice.countDocuments({ ...userFilter, eventDate: { $lt: startOfToday } }),
      Invoice.find(userFilter)
        .sort({ eventDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.status(200).json({
      success: true,
      data: {
        invoices: invoices.map(formatInvoice),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        stats: {
          total,
          upcoming,
          past,
        },
      },
    });
  } catch (error) {
    console.error('Get invoices error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).select('-__v');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Event invoice not found' });
    }

    res.status(200).json({
      success: true,
      data: { invoice: formatInvoice(invoice) },
    });
  } catch (error) {
    console.error('Get invoice error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch event invoice' });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const validation = validateEventPayload(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const referenceNumber = await generateReferenceNumber(req.user.id, Invoice);

    const invoice = await Invoice.create({
      user: req.user.id,
      referenceNumber,
      customerName: validation.normalized.customerName,
      mobileNo: validation.normalized.mobileNo,
      eventName: validation.normalized.eventName,
      eventDate: validation.normalized.eventDate,
    });

    res.status(201).json({
      success: true,
      message: 'Event invoice created successfully',
      data: { invoice: formatInvoice(invoice) },
    });
  } catch (error) {
    console.error('Create invoice error:', error.message);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          'Database index conflict. Restart the backend server once, then try again.',
      });
    }

    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(', ');
      return res.status(400).json({ success: false, message });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create event',
    });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Event invoice not found' });
    }

    const validation = validateEventPayload({
      customerName: req.body.customerName ?? invoice.customerName,
      mobileNo: req.body.mobileNo ?? invoice.mobileNo,
      eventName: req.body.eventName ?? invoice.eventName,
      eventDate: req.body.eventDate ?? invoice.eventDate,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    invoice.customerName = validation.normalized.customerName;
    invoice.mobileNo = validation.normalized.mobileNo;
    invoice.eventName = validation.normalized.eventName;
    invoice.eventDate = validation.normalized.eventDate;

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Event invoice updated successfully',
      data: { invoice: formatInvoice(invoice) },
    });
  } catch (error) {
    console.error('Update invoice error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update event invoice' });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Event invoice not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Event invoice deleted successfully',
    });
  } catch (error) {
    console.error('Delete invoice error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete event invoice' });
  }
};

export const downloadInvoicePDF = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Single event PDF is not available. Use export by date from the dashboard.',
  });
};

export const downloadEventsPDF = async (req, res) => {
  try {
    const { dates } = req.body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one date',
      });
    }

    const uniqueDates = [...new Set(dates.map((d) => String(d).trim()))].filter(Boolean);

    const invalidDate = uniqueDates.find((d) => Number.isNaN(new Date(d).getTime()));
    if (invalidDate) {
      return res.status(400).json({
        success: false,
        message: `Invalid date: ${invalidDate}`,
      });
    }

    const dateFilters = uniqueDates.map(buildDateRangeQuery);

    const events = await Invoice.find({
      user: req.user.id,
      $or: dateFilters,
    })
      .sort({ eventDate: 1, createdAt: 1 })
      .select('-__v');

    const formattedEvents = events.map(formatInvoice);
    const dateLabels = uniqueDates.map(
      (d) =>
        new Date(d).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
    );

    const pdfBuffer = await generateEventsPDFBuffer(formattedEvents, dateLabels);
    const filename = `events-${uniqueDates.join('_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download events PDF error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};
