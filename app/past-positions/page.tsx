import { prisma } from "@/lib/prisma";
import PastPositionsClient from "@/components/past-positions/PastPositionsClient";

export const dynamic = "force-dynamic";

export default async function PastPositionsPage() {
  const positions = await prisma.position.findMany({
    where: {
      status: "CLOSED",
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
    orderBy: {
      closedAt: "desc",
    },
  });

  const serializedPositions = JSON.parse(JSON.stringify(positions));

  return <PastPositionsClient initialPositions={serializedPositions} />;
}