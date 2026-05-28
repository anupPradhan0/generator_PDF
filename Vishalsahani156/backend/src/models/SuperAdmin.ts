import mongoose, { Schema, type InferSchemaType } from "mongoose";

const superAdminSchema = new Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["super_admin"], default: "super_admin", required: true }
  },
  { timestamps: true }
);

export type SuperAdminDocument = InferSchemaType<typeof superAdminSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SuperAdmin = mongoose.model("SuperAdmin", superAdminSchema);

