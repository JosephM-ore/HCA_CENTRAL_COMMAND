import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canCreateFlags } from "@/lib/permissions";

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export async function GET() {
  try {
    const flags = await prisma.flag.findMany({
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
      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({ flags });
  } catch (error) {
    console.error("GET /api/flags failed", error);

    return NextResponse.json(
      { error: "Failed to load flags." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
        { error: "You do not have permission to create flags." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      securityId,
      positionId,
      watchlistEntryId,
      flagType,
      priority,
      description,
    } = body;

    if (!securityId) {
      return NextResponse.json(
        { error: "securityId is required." },
        { status: 400 }
      );
    }

    if (!positionId && !watchlistEntryId) {
      return NextResponse.json(
        { error: "A positionId or watchlistEntryId is required." },
        { status: 400 }
      );
    }

    if (!flagType || typeof flagType !== "string" || !flagType.trim()) {
      return NextResponse.json(
        { error: "Flag type is required." },
        { status: 400 }
      );
    }

    if (!priority || !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: "Priority must be LOW, MEDIUM, or HIGH." },
        { status: 400 }
      );
    }

    const flag = await prisma.flag.create({
      data: {
        securityId,
        positionId: positionId || null,
        watchlistEntryId: watchlistEntryId || null,
        flagType: flagType.trim(),
        priority,
        description: description?.trim() || null,
        status: "OPEN",
        createdById: user.id,
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
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "FLAG_CREATED",
        entityType: "FLAG",
        entityId: flag.id,
        newValueJson: JSON.stringify({
          securityId,
          positionId: positionId || null,
          watchlistEntryId: watchlistEntryId || null,
          flagType: flag.flagType,
          priority: flag.priority,
          description: flag.description,
          status: flag.status,
        }),
      },
    });

    return NextResponse.json({ flag }, { status: 201 });
  } catch (error) {
    console.error("POST /api/flags failed", error);

    return NextResponse.json(
      { error: "Failed to create flag." },
      { status: 500 }
    );
  }
}