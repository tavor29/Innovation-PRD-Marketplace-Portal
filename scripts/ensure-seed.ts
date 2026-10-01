// Run during deploy builds: seed the demo only if the database is empty, so
// redeploys don't wipe what visitors are in the middle of.
import { config } from "dotenv";
config({ path: ".env.local" });
config();

const { db, schema } = await import("../src/db");
const { seedDemo } = await import("../src/lib/demo/seed");
const [anyone] = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
if (anyone) console.log("[ensure-seed] data present, skipping");
else {
  await seedDemo(console.log);
  console.log("[ensure-seed] seeded");
}
process.exit(0);
