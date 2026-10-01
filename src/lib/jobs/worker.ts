// `npm run worker`: processes queued jobs when JOBS_MODE=queue.
import { config } from "dotenv";
config({ path: ".env.local" });
config();

const { PgBoss } = await import("pg-boss");
const { db, schema } = await import("../../db");
const { getAi } = await import("../ai/registry");
type JobData = import("./queue").JobData;

const boss = new PgBoss(process.env.DATABASE_URL!);
boss.on("error", (e) => console.error("[worker]", e));
await boss.start();
await boss.createQueue("wireframe");

await boss.work<JobData["wireframe"]>("wireframe", async (jobs) => {
  for (const job of jobs) {
    const spec = await getAi().wireframe(job.data.content);
    await db.insert(schema.wireframes).values({ prdId: job.data.prdId, specJson: spec });
    console.log(`[worker] wireframe for ${job.data.prdId}`);
  }
});
console.log("[worker] listening for jobs");
