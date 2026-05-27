import mongoose, { Schema, type InferSchemaType } from "mongoose";

const pdfRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true },
    sheetCategory: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    pdfUrl: { type: String, required: false, trim: true },
    filePath: { type: String, required: false, trim: true }
  },
  { timestamps: true }
);

pdfRecordSchema.index({ userId: 1, createdAt: -1 });

export type PdfRecordDocument = InferSchemaType<typeof pdfRecordSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PdfRecord = mongoose.model("PdfRecord", pdfRecordSchema);

