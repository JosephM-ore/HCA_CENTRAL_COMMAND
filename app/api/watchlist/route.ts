import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canEditWatchlist } from "@/lib/permissions";

export async function GET() {
  try {
    const entries = await prisma.watchlistEntry.findMany({
      where: {
        archivedAt: null,
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
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("GET /api/watchlist failed", error);

    return NextResponse.json(
      { error: "Failed to load watchlist." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { ticker, side, targetPrice, comment } = body;

    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json(
        { error: "Ticker is required." },
        { status: 400 }
      );
    }

    if (!side || !["LONG", "SHORT"].includes(side)) {
      return NextResponse.json(
        { error: "Side must be LONG or SHORT." },
        { status: 400 }
      );
    }

    const parsedTargetPrice =
      targetPrice === "" || targetPrice == null ? null : Number(targetPrice);

    if (parsedTargetPrice != null && Number.isNaN(parsedTargetPrice)) {
      return NextResponse.json(
        { error: "Target price must be numeric." },
        { status: 400 }
      );
    }

    const author = await getCurrentUser();

      if (!author) {
        return NextResponse.json(
          { error: "Authentication required." },
          { status: 401 }
        );
      }

      if (!canEditWatchlist(author.role)) {
        return NextResponse.json(
          { error: "You do not have permission to edit the watchlist." },
          { status: 403 }
        );
      }

    const normalizedTicker = ticker.trim().toUpperCase();

    const security = await prisma.security.upsert({
      where: {
        ticker: normalizedTicker,
      },
      update: {},
      create: {
        ticker: normalizedTicker,
        name: normalizedTicker,
        sector: "Uncategorized",
      },
    });

    const entry = await prisma.watchlistEntry.create({
      data: {
        securityId: security.id,
        side,
        targetPrice: parsedTargetPrice,
        notes: comment?.trim() || null,
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
        comments: {
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
        flags: true,
      },
    });

    let entryWithComment = entry;

    if (comment && comment.trim()) {
      await prisma.comment.create({
        data: {
          securityId: security.id,
          watchlistEntryId: entry.id,
          authorId: author.id,
          tag: "COMMENT",
          content: comment.trim(),
        },
      });

      entryWithComment = await prisma.watchlistEntry.findUniqueOrThrow({
        where: {
          id: entry.id,
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
          comments: {
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
          },
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: author.id,
        action: "WATCHLIST_ENTRY_CREATED",
        entityType: "WATCHLIST_ENTRY",
        entityId: entry.id,
        newValueJson: JSON.stringify({
          ticker: normalizedTicker,
          side,
          targetPrice: parsedTargetPrice,
          comment: comment?.trim() || null,
        }),
      },
    });

    return NextResponse.json({ entry: entryWithComment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/watchlist failed", error);

    return NextResponse.json(
      { error: "Failed to create watchlist entry." },
      { status: 500 }
    );
  }
}