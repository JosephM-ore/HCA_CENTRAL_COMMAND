import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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

    const updatedEntry = await prisma.watchlistEntry.update({
      where: {
        id,
      },
      data: {
        side,
        targetPrice,
        notes,
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
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
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

    await prisma.watchlistEntry.update({
      where: {
        id,
      },
      data: {
        archivedAt: new Date(),
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