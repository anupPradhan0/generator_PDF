import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireNotBlocked } from "../../middleware/requireNotBlocked";
import {
  createEvent,
  deleteEvent,
  downloadAllEventsPdf,
  downloadSingleEventPdf,
  getEventById,
  listEvents,
  updateEvent
} from "./events.controller";

export const eventsRoutes = Router();

// Events CRUD (user scoped)
eventsRoutes.post("/", requireAuth, requireNotBlocked, createEvent);
eventsRoutes.get("/", requireAuth, requireNotBlocked, listEvents);
// PDFs
eventsRoutes.get("/pdf/bulk", requireAuth, requireNotBlocked, downloadAllEventsPdf);
eventsRoutes.get("/:id/pdf", requireAuth, requireNotBlocked, downloadSingleEventPdf);
eventsRoutes.get("/:id", requireAuth, requireNotBlocked, getEventById);
eventsRoutes.put("/:id", requireAuth, requireNotBlocked, updateEvent);
eventsRoutes.delete("/:id", requireAuth, requireNotBlocked, deleteEvent);

