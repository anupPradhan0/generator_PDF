import Invoice from '../models/Invoice.js';
import { generateEventsPDFBuffer } from '../utils/generateEventsPDF.js';
import {
  generateReferenceNumber,
  normalizeMobileNo,
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
    const invoices = await Invoice.find({ user: req.user.id })
      .sort({ eventDate: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      data: {
        count: invoices.length,
        invoices: invoices.map(formatInvoice),
      },
    });
  } catch (error) {
    console.error('Get invoices error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch event invoices' });
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
    const { customerName, mobileNo, eventName, eventDate } = req.body;

    if (!customerName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
      });
    }

    if (!mobileNo?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required',
      });
    }

    if (!eventName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Event name is required',
      });
    }

    if (!eventDate) {
      return res.status(400).json({
        success: false,
        message: 'Event date is required',
      });
    }

    const parsedEventDate = new Date(eventDate);
    if (Number.isNaN(parsedEventDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event date',
      });
    }

    const referenceNumber = await generateReferenceNumber(req.user.id, Invoice);

    const invoice = await Invoice.create({
      user: req.user.id,
      referenceNumber,
      customerName: customerName.trim(),
      mobileNo: normalizeMobileNo(mobileNo),
      eventName: eventName.trim(),
      eventDate: parsedEventDate,
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

    if (req.body.customerName !== undefined) {
      if (!req.body.customerName?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Customer name is required',
        });
      }
      invoice.customerName = req.body.customerName.trim();
    }

    if (req.body.mobileNo !== undefined) {
      if (!req.body.mobileNo?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is required',
        });
      }
      invoice.mobileNo = normalizeMobileNo(req.body.mobileNo);
    }

    if (req.body.eventName !== undefined) {
      if (!req.body.eventName?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Event name is required',
        });
      }
      invoice.eventName = req.body.eventName.trim();
    }

    if (req.body.eventDate !== undefined) {
      const parsedEventDate = new Date(req.body.eventDate);
      if (Number.isNaN(parsedEventDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid event date',
        });
      }
      invoice.eventDate = parsedEventDate;
    }

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
