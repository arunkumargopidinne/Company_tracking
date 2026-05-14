import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl() ?? "",
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function hasDatabaseUrl() {
  const url = getDatabaseUrl();

  if (!url) return false;

  try {
    const parsed = new URL(url);
    const username = decodeURIComponent(parsed.username || "");
    const password = decodeURIComponent(parsed.password || "");
    return Boolean(
      parsed.protocol.startsWith("postgres") &&
        username &&
        username !== "johndoe" &&
        password &&
        password !== "randompassword",
    );
  } catch {
    return false;
  }
}

export function getDatabaseUrl() {
  return normalizeEnvValue(process.env.DATABASE_URL);
}

function normalizeEnvValue(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}
