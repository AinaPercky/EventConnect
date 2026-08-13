import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

if (!postgresUrl && (!sqlHost || !sqlDbName || !user || !password)) {
  console.warn("SQL environment variables not fully set. Migrations may fail if not run in a configured environment.");
}

export default defineConfig(
  postgresUrl
    ? {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        schemaFilter: ["public"],
        dbCredentials: { url: postgresUrl },
        verbose: true,
      }
    : {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        schemaFilter: ["public"],
        dbCredentials: {
          host: sqlHost || "",
          user: user || "",
          password: password || "",
          database: sqlDbName || "",
          ssl: false,
        },
        verbose: true,
      }
);
