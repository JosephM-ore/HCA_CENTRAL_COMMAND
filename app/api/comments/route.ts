import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_TAGS = ["COMMENT", "THESIS", "RISK", "CATALYST", "TRADE", "EXIT"];

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      securityId,
      positionId,
      watchlistEntryId,
      tag,
      content,
    } = body;

    if (!securityId) {
      return NextResponse.json(
        { error: "securityId is required." },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Comment content is required." },
        { status: 400 }
      );
    }

    if (!tag || !VALID_TAGS.includes(tag)) {
      return NextResponse.json(
        { error: "Valid comment tag is required." },
        { status: 400 }
      );
    }

    if (!positionId && !watchlistEntryId) {
      return NextResponse.json(
        { error: "A positionId or watchlistEntryId is required." },
        { status: 400 }
      );
    }

    // Temporary MVP author until auth is wired.
    const author = await prisma.user.findUnique({
      where: {
        email: "trader1@example.com",
      },
    });

    if (!author) {
      return NextResponse.json(
        { error: "Default seeded author not found. Run prisma db seed." },
        { status: 500 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        securityId,
        positionId: positionId || null,
        watchlistEntryId: watchlistEntryId || null,
        authorId: author.id,
        tag,
        content: content.trim(),
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
    });

    await prisma.auditLog.create({
      data: {
        actorId: author.id,
        action: "COMMENT_CREATED",
        entityType: "COMMENT",
        entityId: comment.id,
        newValueJson: JSON.stringify({
          securityId,
          positionId: positionId || null,
          watchlistEntryId: watchlistEntryId || null,
          tag,
          content: content.trim(),
        }),
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/comments failed", error);

    return NextResponse.json(
      { error: "Failed to create comment." },
      { status: 500 }
    );
  }
}