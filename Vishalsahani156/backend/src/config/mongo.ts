import mongoose from "mongoose";
import { env } from "./env";

const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectMongo(): Promise<void> {
  mongoose.set("strictQuery", true);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      return;
    } catch (err) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS) break;
      // eslint-disable-next-line no-console
      console.warn(
        `MongoDB not ready (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${RETRY_DELAY_MS}ms...`
      );
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

