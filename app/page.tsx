import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const positions = await prisma.position.findMany({
    where: {
      status: "ACTIVE",
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