// `npm run db:seed`: wipe and reseed the demo data (src/lib/demo/seed.ts).
import { config } from "dotenv";
config({ path: ".env.local" });
config();

const { seedDemo } = await import("../lib/demo/seed");
await seedDemo(console.log);
console.log("Seed complete. Demo users: submitter@ / manager@ / dev@ / admin@meridian.demo, password: password123");
process.exit(0);
