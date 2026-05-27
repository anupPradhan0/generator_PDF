import mongoose from 'mongoose';
import { migrateInvoiceIndexes } from './migrateIndexes.js';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    await migrateInvoiceIndexes();
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.error(
      'Tip: MongoDB in Docker will be set up later inside the Anurag313y folder.',
    );
    process.exit(1);
  }
};

export default connectDB;
