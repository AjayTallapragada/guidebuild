import { app } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { triggerScheduler } from "./modules/triggers/trigger.scheduler.js";

async function bootstrap() {
  await connectDatabase();
  triggerScheduler.start();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

bootstrap().catch((error: unknown) => {
  console.error("Fatal bootstrap error", error);
  process.exit(1);
});
