// Background jobs (PRD 7.1: pg-boss on the same Postgres). Wireframe
// rendering is the only job. The mock renders instantly, so by default jobs
// run inline; set JOBS_MODE=queue to send them to pg-boss and run
// `npm run worker` alongside the app (a real model can take a while).
import type { PrdContent } from "../prd/schema";

export type JobName = "wireframe";
export type JobData = { wireframe: { prdId: string; content: PrdContent } };

export async function enqueue<N extends JobName>(name: N, data: JobData[N], inline: (d: JobData[N]) => Promise<void>) {
  if (process.env.JOBS_MODE !== "queue") return inline(data);
  const { PgBoss } = await import("pg-boss");
  const boss = new PgBoss(process.env.DATABASE_URL!);
  await boss.start();
  await boss.createQueue(name);
  await boss.send(name, data);
  await boss.stop();
}
