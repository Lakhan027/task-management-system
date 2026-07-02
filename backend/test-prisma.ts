import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool as any);

const prisma = new PrismaClient({
  adapter,
});

async function main(): Promise<void> {
  await prisma.$connect();
  console.log("✅ Connected to PostgreSQL");

  const result = await prisma.$queryRaw`SELECT NOW() AS time`;
  console.log(result);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
});
