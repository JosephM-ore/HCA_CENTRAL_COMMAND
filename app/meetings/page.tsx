import { prisma } from "@/lib/prisma";
import MeetingsClient from "@/components/meetings/MeetingsClient";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const meetings = await prisma.meeting.findMany({
    include: {
      comments: {
        where: {
          archivedAt: null,
        },
        include: {
          security: true,
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
    },
    orderBy: {
      meetingDate: "desc",
    },
  });

  const securities =
    await prisma.security.findMany({
      orderBy: {
        ticker: "asc",
      },
    });

  return (
    <MeetingsClient
      initialMeetings={JSON.parse(
        JSON.stringify(meetings)
      )}
      securities={JSON.parse(
        JSON.stringify(securities)
      )}
    />
  );
}