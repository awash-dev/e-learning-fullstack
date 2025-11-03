// drizzle.config.js
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './config/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_pICQT7kF9Ocd@ep-patient-pine-adh0aigy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
  },
});