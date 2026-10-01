// Local Postgres without Docker: runs the embedded-postgres binaries on
// :5432 with the same credentials as docker-compose.yml. Data lives in
// ./.pgdata (gitignored). Stop with Ctrl+C.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const dataDir = "./.pgdata";
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "portal",
  password: "portal",
  port: 5432,
  persistent: true,
  // UTF-8 regardless of the Windows locale, so Hebrew text can be stored.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (!existsSync(dataDir)) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("portal");
} catch {
  // already exists
}
console.log("Postgres ready: postgres://portal:portal@localhost:5432/portal");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
