import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function parseNumber(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return parsed;
}

function parseTradeType(value: unknown) {
  const tradeType = String(value || "").trim().toUpperCase();

  if (!["BUY", "SELL", "SHORT", "COVER"].includes(tradeType)) {
    throw new Error("Trade type must be BUY, SELL, SHORT, or COVER.");
  }

  return tradeType;
}

function canLogManualTrade(role?: string | null) {
  return ["ADMIN", "TRADER", "PM"].includes(role || "");
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (!canLogManualTrade(currentUser.role)) {
      return NextResponse.json(
        { error: "You do not have permission to log trades." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const securityId = String(body.securityId || "").trim();
    const positionId = body.positionId ? String(body.positionId) : null;
    const tradeType = parseTradeType(body.tradeType);
    const shares = parseNumber(body.shares, "Shares");
    const avgPrice = parseNumber(body.avgPrice, "Average price");
    const dateTraded = body.dateTraded ? new Date(body.dateTraded) : new Date();
    const comment = body.comment ? String(body.comment).trim() : null;

    if (!securityId) {
      return NextResponse.json(
        { error: "securityId is required." },
        { status: 400 }
      );
    }

    if (Number.isNaN(dateTraded.getTime())) {
      return NextResponse.json(
        { error: "dateTraded must be a valid date." },
        { status: 400 }
      );
    }

    const security = await prisma.security.findUnique({
      where: {
        id: securityId,
      },
    });

    if (!security) {
      return NextResponse.json(
        { error: "Security not found." },
        { status: 404 }
      );
    }

    const trade = await prisma.trade.create({
      data: {
        securityId,
        positionId,
        dateTraded,
        shares,
        avgPrice,
        tradeType,
        notional: shares * avgPrice,
        comment,
        source: "MANUAL",
        reconciliationStatus: "MANUAL_PENDING",
        manualEnteredById: currentUser.id,
        isHidden: false,
      },
      include: {
        security: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: "MANUAL_TRADE_CREATED",
        entityType: "TRADE",
        entityId: trade.id,
        newValueJson: JSON.stringify({
          securityId,
          ticker: security.ticker,
          positionId,
          tradeType,
          shares,
          avgPrice,
          dateTraded,
          comment,
        }),
      },
    });

    return NextResponse.json({ trade }, { status: 201 });
  } catch (error) {
    console.error("POST /api/trades/manual failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create manual trade.",
      },
      { status: 500 }
    );
  }
}