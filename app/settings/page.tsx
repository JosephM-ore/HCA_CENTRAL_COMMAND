import { prisma } from "@/lib/prisma";
import SettingsClient from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [auditLogCount, ingestionRuns, users] = await Promise.all([
    prisma.auditLog.count(),
    prisma.ingestionRun.findMany({
      orderBy: {
        startedAt: "desc",
      },
      take: 5,
    }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: {
        email: "asc",
      },
    }),
  ]);

  const serializedIngestionRuns = JSON.parse(JSON.stringify(ingestionRuns));
  const serializedUsers = JSON.parse(JSON.stringify(users));

  return (
    <SettingsClient
      auditLogCount={auditLogCount}
      ingestionRuns={serializedIngestionRuns}
      users={serializedUsers}
    />
  );
}