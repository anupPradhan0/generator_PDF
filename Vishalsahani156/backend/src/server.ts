import { app } from "./app";
import { connectMongo } from "./config/mongo";
import { env } from "./config/env";

async function main() {
  await connectMongo();
  app.listen(env.PORT, "0.0.0.0", () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

