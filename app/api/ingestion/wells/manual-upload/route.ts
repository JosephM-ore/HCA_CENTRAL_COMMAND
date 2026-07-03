import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectWellsReportType } from "@/lib/ingestion/wells-detect-report";

import { parseWellsTransactionActivityCsv } from "@/lib/ingestion/wells-transaction-activity";

async function bufferToString(buffer: ArrayBuffer): Promise<string> {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

function normalizeFilename(filename: string): string {
  return filename.replace(/\s+/g, "_").trim();
}

function rowsToSummary(rows: any[]) {
  return rows.length;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const fileName = normalizeFilename(file.name);
    const fileType = file.type || "text/csv";
    const rawContent = await file.text();
    const reportType = detectWellsReportType(rawContent);

    const ingestionRun = await prisma.ingestionRun.create({
      data: {
        source: "WELLS_FARGO",
        status: "STARTED",
        message: `Wells Fargo ingestion started for ${fileName}`,
        fileName,
        fileType,
      },
    });

    if (reportType === "UNKNOWN") {
      await prisma.ingestionRun.update({ where: { id: ingestionRun.id }, data: { status: "FAILED", message: "Unrecognized Wells report type.", endedAt: new Date() } });
      return NextResponse.json({ error: "Unrecognized Wells report type.", reportType }, { status: 400 });
    }

    if (reportType === "CHANGE_IN_EQUITY_PERFORMANCE" || reportType === "PORTFOLIO_RISK_EXPOSURE") {
      await prisma.ingestionRun.update({ where: { id: ingestionRun.id }, data: { status: "COMPLETED", message: `Detected report type ${reportType}, ingestion not implemented.`, endedAt: new Date() } });
      return NextResponse.json({ source: "WELLS_FARGO", reportType, message: "NOT_IMPLEMENTED_FOR_THIS_REPORT_TYPE" }, { status: 200 });
    }

    let rowsProcessed = 0;
    let rowsFailed = 0;
    let securitiesCreated = 0;
    let securitiesUpdated = 0;
    let positionsCreated = 0;
    let positionsUpdated = 0;
    let tradesCreated = 0;
    let tradesUpdated = 0;
    const failures: string[] = [];

    const sourceReportDate = new Date();
    const sourceRowHashBase = fileName;

    if (reportType === "TAX_LOT_POSITION_PNL") {
      await prisma.ingestionRun.update({
        where: { id: ingestionRun.id },
        data: {
          status: "COMPLETED",
          message:
            "Detected TAX_LOT_POSITION_PNL report type, but position ingestion is not implemented yet.",
          rowsProcessed: 0,
          rowsFailed: 0,
          detailsJson: JSON.stringify({
            reason:
              "Tax lot position parser is intentionally disabled until Investment Total / open tax lot parsing is validated.",
          }),
          endedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          source: "WELLS_FARGO",
          reportType,
          message: "NOT_IMPLEMENTED_FOR_THIS_REPORT_TYPE",
          reason:
            "Tax lot position ingestion is disabled until parser preview validation is complete.",
        },
        { status: 200 }
      );
    }

    if (reportType === "TRANSACTION_ACTIVITY") {
      const { rows, failures: parseFailures } = parseWellsTransactionActivityCsv(rawContent, fileName);
      rowsFailed += parseFailures.length;
      failures.push(...parseFailures);
      rowsProcessed += rows.length;

      for (const row of rows) {
        if (!row.accountNumber) {
          failures.push(`Missing accountNumber for row ${row.sourceRowHash}`);
          rowsFailed += 1;
          continue;
        }

        if (!row.securityName && !row.ticker) {
          failures.push(`Missing securityName/ticker for row ${row.sourceRowHash}`);
          rowsFailed += 1;
          continue;
        }

        const tradeType = row.tradeType || "UNSUPPORTED";
        if (tradeType === "UNSUPPORTED") {
          failures.push(`Unsupported activity '${row.activity}' for row ${row.sourceRowHash}`);
          rowsFailed += 1;
          continue;
        }

        let security = null;
        if (row.ticker) {
          security = await prisma.security.findUnique({ where: { ticker: row.ticker } });
        }

        if (!security) {
          security = await prisma.security.create({
            data: {
              ticker: row.ticker || row.securityName || "UNKNOWN",
              name: row.securityName || row.ticker || "UNKNOWN",
              wellsSecurityId: row.wfSecId,
              cusip: row.cusip,
              isin: row.isin,
              sedol: row.sedol,
            },
          });
          securitiesCreated += 1;
        } else {
          securitiesUpdated += 1;
        }

        const lookupTransactionId = row.transactionId || row.sourceRowHash;

        const tradeData = {
          securityId: security.id,
          dateTraded: row.tradeDate ? new Date(row.tradeDate) : new Date(),
          settlementDate: row.settlementDate ? new Date(row.settlementDate) : undefined,
          postDate: row.postDate ? new Date(row.postDate) : undefined,
          tradeType,
          shares: row.quantity ?? 0,
          avgPrice: row.price ?? 0,
          commission: row.commission,
          fees: row.fees,
          accruedInterest: row.accruedInterest,
          netAmount: row.netAmount,
          currency: row.currency,
          transactionId: row.transactionId,
          clientReferenceId: row.clientReferenceId,
          source: "WELLS_FARGO",
          sourceFileName: row.sourceFileName,
          sourceRowHash: row.sourceRowHash,
          sourceReportDate: row.sourceReportDate ? new Date(row.sourceReportDate) : sourceReportDate,
          ingestionRunId: ingestionRun.id,
          comment: undefined,
        };

        const existingTrade = row.transactionId
          ? await prisma.trade.findFirst({ where: { transactionId: row.transactionId } })
          : await prisma.trade.findFirst({ where: { sourceRowHash: row.sourceRowHash } });

        if (existingTrade) {
          await prisma.trade.update({ where: { id: existingTrade.id }, data: tradeData });
          tradesUpdated += 1;
        } else {
          await prisma.trade.create({ data: tradeData });
          tradesCreated += 1;
        }
      }
    }

    await prisma.ingestionRun.update({
      where: { id: ingestionRun.id },
      data: {
        status: "COMPLETED",
        message: `Wells ingestion ${reportType} completed.
Processed ${rowsProcessed} rows, failed ${rowsFailed}.`,
        rowsProcessed,
        rowsFailed,
        sourceReportDate,
        accountNumber: undefined,
        detailsJson: JSON.stringify({ failures }),
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      source: "WELLS_FARGO",
      reportType,
      rowsProcessed,
      rowsFailed,
      securitiesCreated,
      securitiesUpdated,
      positionsCreated,
      positionsUpdated,
      tradesCreated,
      tradesUpdated,
      failures,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
