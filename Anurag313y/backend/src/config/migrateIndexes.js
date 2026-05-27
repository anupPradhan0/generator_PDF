import Invoice from '../models/Invoice.js';

const LEGACY_INDEXES = ['user_1_invoiceNumber_1', 'invoiceNumber_1'];

export const migrateInvoiceIndexes = async () => {
  const collection = Invoice.collection;

  for (const indexName of LEGACY_INDEXES) {
    try {
      await collection.dropIndex(indexName);
      console.log(`Dropped legacy index: ${indexName}`);
    } catch (error) {
      if (error.code !== 27 && error.codeName !== 'IndexNotFound') {
        console.warn(`Could not drop index ${indexName}:`, error.message);
      }
    }
  }

  await Invoice.syncIndexes();
  console.log('Invoice indexes synced');
};
