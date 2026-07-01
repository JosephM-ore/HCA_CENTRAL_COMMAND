import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canCreateFlags } from "@/lib/permissions";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (!canCreateFlags(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to resolve flags." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const existingFlag = await prisma.flag.findUnique({
      where: {
        id,
      },
    });

    if (!existingFlag) {
      return NextResponse.json(
        { error: "Flag not found." },
        { status: 404 }
      );
    }

    if (existingFlag.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Flag is already resolved." },
        { status: 400 }
      );
    }

    const resolvedFlag = await prisma.flag.update({
      where: {
        id,
      },
      data: {
        status: "RESOLVED",
        resolvedById: user.id,
        resolvedAt: new Date(),
      },
      include: {
        security: true,
        position: true,
        watchlistEntry: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        resolvedBy: {
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
        actorId: user.id,
        action: "FLAG_RESOLVED",
        entityType: "FLAG",
        entityId: resolvedFlag.id,
        previousValueJson: JSON.stringify({
          status: existingFlag.status,
          resolvedById: existingFlag.resolvedById,
          resolvedAt: existingFlag.resolvedAt,
        }),
        newValueJson: JSON.stringify({
          status: resolvedFlag.status,
          resolvedById: resolvedFlag.resolvedById,
          resolvedAt: resolvedFlag.resolvedAt,
        }),
      },
    });

    return NextResponse.json({ flag: resolvedFlag });
  } catch (error) {
    console.error("POST /api/flags/[id]/resolve failed", error);

    return NextResponse.json(
      { error: "Failed to resolve flag." },
      { status: 500 }
    );
  }
}