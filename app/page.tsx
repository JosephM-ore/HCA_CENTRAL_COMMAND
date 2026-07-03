import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const wellsActivePositionCount = await prisma.position.count({
    where: {
      status: "ACTIVE",
      source: "WELLS_FARGO",
    },
  });

  const positions = await prisma.position.findMany({
    where: {
      status: "ACTIVE",
      ...(wellsActivePositionCount > 0
        ? {
            source: "WELLS_FARGO",
          }
        : {}),
    },
    include: {
      security: {
        include: {
          marketData: {
            take: 1,
            orderBy: {
              updatedAt: "desc",
            },
          },
        },
      },
      trades: {
        orderBy: {
          dateTraded: "desc",
        },
      },
      comments: {
        where: {
          archivedAt: null,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      flags: {
        where: {
          status: "OPEN",
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: [
      {
        side: "asc",
      },
      {
        marketValue: "desc",
      },
    ],
  });

  const serializedPositions = JSON.parse(JSON.stringify(positions));

  return <DashboardClient positions={serializedPositions} />;
}