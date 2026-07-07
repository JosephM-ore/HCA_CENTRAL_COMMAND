import { prisma } from "@/lib/prisma";
import AlertsClient from "@/components/alerts/AlertsClient";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const flags = await prisma.flag.findMany({
  where: {
    status: "OPEN",
  },
  include: {
    security: true,
    position: true,
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
  },
  orderBy: [
    {
      priority: "desc",
    },
    {
      createdAt: "desc",
    },
  ],
});

  const serializedFlags = JSON.parse(JSON.stringify(flags));

  return <AlertsClient initialFlags={serializedFlags} />;
}