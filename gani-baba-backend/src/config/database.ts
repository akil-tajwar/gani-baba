import dotenv from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../schemas";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from .env file");
}

// Create a connection pool using the full URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Adjust this value based on your needs
  ssl: {
    rejectUnauthorized: false, // <--- Crucial for Neon / Cloud databases
  },
});

// Create and export the Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Test the database connection
export async function testDatabaseConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log("Connected to the PostgreSQL database!");
    client.release();
  } catch (err) {
    console.error("Error connecting to the database:", (err as Error).message);
    throw err;
  }
}

// Export the pool for direct usage if needed
export { pool };