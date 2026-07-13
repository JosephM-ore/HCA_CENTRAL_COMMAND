import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canEditWatchlist } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";
function parseTargetPrice(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error("Target price must be a valid number.");
  }

  return numberValue;
}

function parseNotes(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const textValue = String(value).trim();

  return textValue.length > 0 ? textValue : null;
}

function formatPriceForComment(value: number | null) {
  if (value == null) return "—";

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function targetPriceChanged(oldValue: number | null, newValue: number | null) {
  if (oldValue == null && newValue == null) return false;
  if (oldValue == null || newValue == null) return true;

  return Math.abs(oldValue - newValue) > 0.000001;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    
    const author = await getCurrentUser();

    if (!author) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (!canEditWatchlist(author.role)) {
      return NextResponse.json(
        {
          error: "You do not have permission to edit the watchlist.",
        },
        { status: 403 }
      );
    }


   
    const existingEntry = await prisma.watchlistEntry.findUnique({
      where: {
        id,
      },
      include: {
        security: true,
      },
    });


    if (!existingEntry) {
      return NextResponse.json(
        {
          error: "Watchlist item not found.",
        },
        { status: 404 }
      );
    }

    const side = body.side;

    if (side !== "LONG" && side !== "SHORT") {
      return NextResponse.json(
        {
          error: "Side must be LONG or SHORT.",
        },
        { status: 400 }
      );
    }

    let targetPrice: number | null;

    try {
      targetPrice = parseTargetPrice(body.targetPrice);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid target price.",
        },
        { status: 400 }
      );
    }

    const notes = parseNotes(body.notes);
    const didTargetPriceChange = targetPriceChanged(
      existingEntry.targetPrice,
      targetPrice
    );

    const ptChangeComment = parseNotes(body.ptChangeComment);

    if (didTargetPriceChange && !ptChangeComment) {
      return NextResponse.json(
        {
          error: "Changing price target requires a PT change comment.",
        },
        { status: 400 }
      );
    }

    
  await prisma.$transaction(async (tx) => {
    await tx.watchlistEntry.update({
      where: {
        id,
      },
      data: {
        side,
        targetPrice,
        notes,
      },
    });

    if (didTargetPriceChange) {
      await tx.comment.create({
        data: {
          securityId: existingEntry.securityId,
          watchlistEntryId: existingEntry.id,
          authorId: author.id,
          tag: "PT",
          content: `Price target changed from ${formatPriceForComment(
            existingEntry.targetPrice
          )} to ${formatPriceForComment(targetPrice)}. Reason: ${ptChangeComment}`,
        },
      });
    }
  });


  const updatedEntry = await prisma.watchlistEntry.findUniqueOrThrow({
    where: {
      id,
    },
    include: {
      security: {
        include: {
          marketData: {
            orderBy: {
              updatedAt: "desc",
            },
            take: 1,
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
        take: 5,
      },
    },
  });


    return NextResponse.json({
      watchlistEntry: updatedEntry,
    });
  } catch (error) {
    console.error("Failed to update watchlist item:", error);

    return NextResponse.json(
      {
        error: "Failed to update watchlist item.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const author = await getCurrentUser();

    if (!author) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (!canEditWatchlist(author.role)) {
      return NextResponse.json(
        {
          error: "You do not have permission to edit the watchlist.",
        },
        { status: 403 }
      );
    }

    const existingEntry = await prisma.watchlistEntry.findUnique({
      where: {
        id,
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        {
          error: "Watchlist item not found.",
        },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.comment.updateMany({
        where: {
          watchlistEntryId: id,
          archivedAt: null,
        },
        data: {
          archivedAt: new Date(),
        },
      }),

      prisma.flag.updateMany({
        where: {
          watchlistEntryId: id,
          status: "OPEN",
        },
        data: {
          status: "ARCHIVED",
        },
      }),

      prisma.watchlistEntry.update({
        where: {
          id,
        },
        data: {
          archivedAt: new Date(),
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId: author.id,
        action: "WATCHLIST_ENTRY_DELETED",
        entityType: "WATCHLIST_ENTRY",
        entityId: id,
        newValueJson: JSON.stringify({
          id,
          archivedAt: new Date(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      id,
    });
  } catch (error) {
    console.error("Failed to remove watchlist item:", error);

    return NextResponse.json(
      {
        error: "Failed to remove watchlist item.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}