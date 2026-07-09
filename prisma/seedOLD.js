const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding HCA Central Command...");

  await prisma.auditLog.deleteMany();
  await prisma.ingestionRun.deleteMany();
  await prisma.marketDataCache.deleteMany();
  await prisma.flag.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.watchlistEntry.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.position.deleteMany();
  await prisma.security.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash,
      role: "ADMIN",
    },
  });

  const trader1 = await prisma.user.create({
    data: {
      email: "trader1@example.com",
      name: "Joseph Moore",
      passwordHash,
      role: "TRADER",
    },
  });

  const trader2 = await prisma.user.create({
    data: {
      email: "trader2@example.com",
      name: "A. Chen",
      passwordHash,
      role: "TRADER",
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: "viewer@example.com",
      name: "Viewer User",
      passwordHash,
      role: "VIEWER",
    },
  });

  const securitiesInput = [
    ["AAPL", "Apple Inc.", "Technology"],
    ["MSFT", "Microsoft Corp.", "Technology"],
    ["NVDA", "NVIDIA Corp.", "Semiconductors"],
    ["AMZN", "Amazon.com Inc.", "Consumer / Cloud"],
    ["LLY", "Eli Lilly & Co.", "Healthcare"],
    ["TSLA", "Tesla Inc.", "Consumer Auto"],
    ["BA", "Boeing Co.", "Industrials"],
    ["NFLX", "Netflix Inc.", "Communication"],
    ["AMD", "Advanced Micro Devices", "Semiconductors"],
    ["SHOP", "Shopify Inc.", "Software"],
    ["UBER", "Uber Technologies", "Consumer"],
    ["CRWD", "CrowdStrike", "Cybersecurity"],
    ["SNOW", "Snowflake Inc.", "Software"],
    ["COIN", "Coinbase Global", "Financials"],
    ["RIVN", "Rivian Automotive", "Consumer Auto"],
    ["PLTR", "Palantir Technologies", "Software"],
    ["CVNA", "Carvana Co.", "Consumer"],
    ["GME", "GameStop Corp.", "Retail"],
    ["META", "Meta Platforms", "Communication"],
    ["DIS", "Walt Disney Co.", "Communication"],
    ["PYPL", "PayPal Holdings", "Financials"],
    ["INTC", "Intel Corp.", "Semiconductors"],
  ];

  const securities = {};

  for (const [ticker, name, sector] of securitiesInput) {
    const security = await prisma.security.create({
      data: { ticker, name, sector },
    });

    securities[ticker] = security;
  }

  const activePositionsInput = [
    {
      ticker: "AAPL",
      side: "LONG",
      shares: 10000,
      wap: 180.2,
      marketValue: 1934000,
      portfolioPct: 14.6,
      totalPctChange: 7.33,
      dayPctChange: 1.2,
      comment: "Services margin remains intact. Watch China demand and iPhone mix.",
      flagType: "Earnings Upcoming",
      priority: "MEDIUM",
    },
    {
      ticker: "MSFT",
      side: "LONG",
      shares: 8000,
      wap: 390.1,
      marketValue: 3056000,
      portfolioPct: 23.1,
      totalPctChange: -2.08,
      dayPctChange: -0.7,
      comment: "Azure deceleration needs context against capex ramp and AI backlog.",
      flagType: "Risk Review",
      priority: "HIGH",
    },
    {
      ticker: "NVDA",
      side: "LONG",
      shares: 5000,
      wap: 850,
      marketValue: 4552500,
      portfolioPct: 34.4,
      totalPctChange: 7.12,
      dayPctChange: 2.9,
      comment: "Demand remains strong but valuation discipline is key after recent move.",
      flagType: "Valuation Stretched",
      priority: "HIGH",
    },
    {
      ticker: "AMZN",
      side: "LONG",
      shares: 7500,
      wap: 171.8,
      marketValue: 1269000,
      portfolioPct: 9.6,
      totalPctChange: -1.51,
      dayPctChange: 0.4,
      comment: "AWS margin recovery still central. Retail ads upside underappreciated.",
      flagType: "Margin Pressure",
      priority: "MEDIUM",
    },
    {
      ticker: "LLY",
      side: "LONG",
      shares: 1600,
      wap: 742,
      marketValue: 1250400,
      portfolioPct: 9.4,
      totalPctChange: 5.32,
      dayPctChange: -0.2,
      comment: "GLP-1 demand remains exceptional; monitor manufacturing capacity commentary.",
      flagType: "Under Review",
      priority: "MEDIUM",
    },
    {
      ticker: "TSLA",
      side: "SHORT",
      shares: 4000,
      wap: 210,
      marketValue: 780000,
      portfolioPct: 5.9,
      totalPctChange: 7.14,
      dayPctChange: -1.1,
      comment: "Short thesis tied to pricing pressure and margin deterioration.",
      flagType: "Margin Pressure",
      priority: "HIGH",
    },
    {
      ticker: "BA",
      side: "SHORT",
      shares: 3000,
      wap: 183,
      marketValue: 528000,
      portfolioPct: 4.0,
      totalPctChange: 3.83,
      dayPctChange: 0.8,
      comment: "Quality and delivery risk remain unresolved; monitor FAA updates.",
      flagType: "Quality Risk",
      priority: "HIGH",
    },
    {
      ticker: "NFLX",
      side: "SHORT",
      shares: 1000,
      wap: 502,
      marketValue: 485000,
      portfolioPct: 3.7,
      totalPctChange: 3.39,
      dayPctChange: 0.5,
      comment: "Valuation risk after ad tier upside was priced in.",
      flagType: "Valuation Stretched",
      priority: "MEDIUM",
    },
  ];

  const positions = {};

  for (const p of activePositionsInput) {
    const position = await prisma.position.create({
      data: {
        securityId: securities[p.ticker].id,
        side: p.side,
        status: "ACTIVE",
        shares: p.shares,
        wap: p.wap,
        marketValue: p.marketValue,
        portfolioPct: p.portfolioPct,
        totalPctChange: p.totalPctChange,
        dayPctChange: p.dayPctChange,
        openedAt: new Date("2026-05-01"),
      },
    });

    positions[p.ticker] = position;

    await prisma.comment.create({
      data: {
        securityId: securities[p.ticker].id,
        positionId: position.id,
        authorId: trader1.id,
        tag: p.side === "SHORT" ? "THESIS" : "COMMENT",
        content: p.comment,
      },
    });

    await prisma.comment.create({
      data: {
        securityId: securities[p.ticker].id,
        positionId: position.id,
        authorId: trader2.id,
        tag: "RISK",
        content: `Monitor ${p.ticker} for thesis drift, sizing changes, and market-data context.`,
      },
    });

    await prisma.flag.create({
      data: {
        securityId: securities[p.ticker].id,
        positionId: position.id,
        flagType: p.flagType,
        description: `${p.flagType} flag for ${p.ticker}.`,
        priority: p.priority,
        status: "OPEN",
        createdById: trader1.id,
      },
    });

    await prisma.trade.create({
      data: {
        securityId: securities[p.ticker].id,
        positionId: position.id,
        dateTraded: new Date("2026-06-21"),
        shares: Math.round(p.shares * 0.2),
        avgPrice: p.wap + 5,
        ptHistory: "$205 PT → $212 PT",
        comment: "Added after pullback",
      },
    });

    await prisma.trade.create({
      data: {
        securityId: securities[p.ticker].id,
        positionId: position.id,
        dateTraded: new Date("2026-06-10"),
        shares: Math.round(p.shares * 0.3),
        avgPrice: p.wap,
        ptHistory: "$200 PT → $205 PT",
        comment: "Initial add",
      },
    });
  }

  const watchlistInput = [
    ["AMD", "LONG", 148, "AI GPU share gains; waiting for better risk/reward.", "Candidate"],
    ["SHOP", "LONG", 65, "Merchant growth improving; valuation still demanding.", "Under Review"],
    ["UBER", "LONG", 62, "Operating leverage and buyback optionality.", "Candidate"],
    ["CRWD", "LONG", 295, "Durable endpoint growth; monitor net retention.", "Candidate"],
    ["SNOW", "LONG", 130, "Consumption stabilization candidate.", "Under Review"],
    ["COIN", "SHORT", 275, "Short candidate if crypto momentum fades.", "Candidate"],
    ["RIVN", "SHORT", 17, "Cash burn and demand risk remain key.", "Credit Watch"],
    ["PLTR", "SHORT", 70, "Valuation short candidate after multiple expansion.", "Valuation Stretched"],
    ["CVNA", "SHORT", 118, "Credit and cyclicality watch.", "Credit Watch"],
    ["GME", "SHORT", 31, "Event-driven short candidate only.", "Event-driven"],
  ];

  for (const [ticker, side, targetPrice, notes, flagType] of watchlistInput) {
    const entry = await prisma.watchlistEntry.create({
      data: {
        securityId: securities[ticker].id,
        side,
        targetPrice,
        notes,
      },
    });

    await prisma.comment.create({
      data: {
        securityId: securities[ticker].id,
        watchlistEntryId: entry.id,
        authorId: trader1.id,
        tag: "COMMENT",
        content: notes,
      },
    });

    await prisma.flag.create({
      data: {
        securityId: securities[ticker].id,
        watchlistEntryId: entry.id,
        flagType,
        description: `${ticker} watchlist review item.`,
        priority: side === "SHORT" ? "MEDIUM" : "LOW",
        status: "OPEN",
        createdById: trader1.id,
      },
    });
  }

  const pastPositionsInput = [
    ["META", "LONG", 280, 342, "Target reached; risk/reward normalized"],
    ["TSLA", "LONG", 210, 195, "Margins deteriorated faster than expected"],
    ["NFLX", "LONG", 410, 485, "Ad tier upside captured"],
    ["BA", "SHORT", 183, 176, "Quality risk remained unresolved"],
    ["DIS", "LONG", 91, 104, "Streaming margin catalyst played out"],
    ["PYPL", "LONG", 64, 59, "Turnaround thesis lost momentum"],
    ["INTC", "SHORT", 37, 33.5, "Foundry risk thesis realized"],
  ];

  for (const [ticker, side, entryPrice, exitPrice, rationale] of pastPositionsInput) {
    const position = await prisma.position.create({
      data: {
        securityId: securities[ticker].id,
        side,
        status: "CLOSED",
        shares: 1000,
        wap: entryPrice,
        marketValue: exitPrice * 1000,
        portfolioPct: null,
        totalPctChange:
          side === "LONG"
            ? ((exitPrice - entryPrice) / entryPrice) * 100
            : ((entryPrice - exitPrice) / entryPrice) * 100,
        dayPctChange: null,
        exitRationale: rationale,
        openedAt: new Date("2026-03-01"),
        closedAt: new Date("2026-06-01"),
      },
    });

    await prisma.comment.create({
      data: {
        securityId: securities[ticker].id,
        positionId: position.id,
        authorId: trader1.id,
        tag: "EXIT",
        content: rationale,
      },
    });
  }

  const marketPrices = {
    AAPL: 193.4,
    MSFT: 382,
    NVDA: 910.5,
    AMZN: 169.2,
    LLY: 781.5,
    TSLA: 195,
    BA: 176,
    NFLX: 485,
    AMD: 162.2,
    SHOP: 71.4,
    UBER: 68.8,
    CRWD: 316.7,
    SNOW: 142.5,
    COIN: 246.2,
    RIVN: 13.8,
    PLTR: 62.1,
    CVNA: 104.4,
    GME: 24.8,
    META: 342,
    DIS: 104,
    PYPL: 59,
    INTC: 33.5,
  };

  for (const ticker of Object.keys(securities)) {
    const price = marketPrices[ticker] || 100;

    await prisma.marketDataCache.create({
      data: {
        securityId: securities[ticker].id,
        currentPrice: price,
        vwap: price * 0.98,
        high52w: price * 1.22,
        low52w: price * 0.72,
        beta: 1.18,
        avgVolume: 58400000,
        shortFloat: null,
        marketCap: price * 1000000000,
        dayChange: 1.24,
        dayPctChange: 0.64,
        volume: null,
        sharesOutstanding: null,
        floatShares: null,
        shortInterestShares: null,
        peLtm: 31.6,
        priceToTangBook: 46.2,
        peNtm: null,
        priceToBook: 39.8,
        debtToEbitda: 1.4,
        eps: 6.12,
        epsTtm: 6.12,
        epsNtm: null,
        bookValue: price * 24,
        bookValuePerShare: 24,
        tangibleBookValue: price * 18,
        tangibleBookValuePerShare: 18,
        enterpriseValue: price * 1100000000,
        ebitda: price * 1200000000,
        totalDebt: price * 150000000,
        revenue: price * 400000000,
        revenueTtm: price * 400000000,
        grossProfit: price * 180000000,
        operatingIncome: price * 120000000,
        netIncome: price * 90000000,
        netIncomeTtm: price * 90000000,
        cashAndEquivalents: price * 50000000,
        totalAssets: price * 500000000,
        totalLiabilities: price * 250000000,
        shareholdersEquity: price * 250000000,
        source: "MOCK",
        marketDataSource: "MOCK",
        fundamentalsSource: "MOCK",
        shortInterestSource: "MOCK",
        dataQuality: "MOCK",
        snapshotAsOf: new Date(),
        fundamentalsAsOf: new Date(),
        shortInterestAsOf: new Date(),
        lastMarketDataRefreshAt: new Date(),
      },
    });
  }

  await prisma.ingestionRun.create({
    data: {
      source: "WELLS_FARGO",
      status: "COMPLETED",
      message: "Mock Wells Fargo position ingestion completed.",
      endedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "SEED_COMPLETED",
      entityType: "SYSTEM",
      entityId: "seed",
      newValueJson: JSON.stringify({
        users: 4,
        securities: securitiesInput.length,
        activePositions: activePositionsInput.length,
      }),
    },
  });

  console.log("Seed complete.");
  console.log("Login users:");
  console.log("admin@example.com / password123");
  console.log("trader1@example.com / password123");
  console.log("trader2@example.com / password123");
  console.log("viewer@example.com / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });