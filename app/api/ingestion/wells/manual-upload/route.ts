import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectWellsReportType } from "@/lib/ingestion/wells-detect-report";
import { parseWellsTaxLotCsv } from "@/lib/ingestion/wells-tax-lot";

function normalizeFilename(filename: string): string {
  return filename.replace(/\s+/g, "_").trim();
}

function isRawPdfContent(content: string): boolean {
  return content.trimStart().startsWith("%PDF-");
}

async function completeIngestionRun(params: {
  id: string;
  status: string;
  message: string;
  rowsProcessed?: number;
  rowsFailed?: number;
  sourceReportDate?: Date;
  accountNumber?: string;
  details?: unknown;
}) {
  const {
    id,
    status,
    message,
    rowsProcessed = 0,
    rowsFailed = 0,
    sourceReportDate,
    accountNumber,
    details,
  } = params;

  await prisma.ingestionRun.update({
    where: { id },
    data: {
      status,
      message,
      rowsProcessed,
      rowsFailed,
      sourceReportDate,
      accountNumber,
      detailsJson: details ? JSON.stringify(details) : undefined,
      endedAt: new Date(),
    },
  });
}

export async function POST(request: Request) {
  let ingestionRunId: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const fileName = normalizeFilename(file.name);
    const fileType = file.type || "text/plain";
    const rawContent = await file.text();

    const ingestionRun = await prisma.ingestionRun.create({
      data: {
        source: "WELLS_FARGO",
        status: "STARTED",
        message: `Wells Fargo ingestion started for ${fileName}`,
        fileName,
        fileType,
      },
    });

    ingestionRunId = ingestionRun.id;

    if (isRawPdfContent(rawContent)) {
      await completeIngestionRun({
        id: ingestionRun.id,
        status: "FAILED",
        message:
          "Raw PDF upload detected. PDF text extraction is required before Wells ingestion.",
        rowsProcessed: 0,
        rowsFailed: 1,
        details: {
          reason:
            "Raw PDF upload is not supported yet. Run pdftotext -layout and upload the extracted .txt file.",
        },
      });

      return NextResponse.json(
        {
          error: "PDF_TEXT_EXTRACTION_REQUIRED",
          message:
            "Raw PDF upload is not supported yet. Run pdftotext -layout and upload the extracted .txt file.",
        },
        { status: 400 }
      );
    }

    const reportType = detectWellsReportType(rawContent);

    if (reportType === "UNKNOWN") {
      await completeIngestionRun({
        id: ingestionRun.id,
        status: "FAILED",
        message: "Unrecognized Wells report type.",
        rowsProcessed: 0,
        rowsFailed: 1,
        details: {
          reason: "Report type detection returned UNKNOWN.",
        },
      });

      return NextResponse.json(
        { error: "Unrecognized Wells report type.", reportType },
        { status: 400 }
      );
    }

    if (
      reportType === "CHANGE_IN_EQUITY_PERFORMANCE" ||
      reportType === "PORTFOLIO_RISK_EXPOSURE" ||
      reportType === "TRANSACTION_ACTIVITY"
    ) {
      await completeIngestionRun({
        id: ingestionRun.id,
        status: "COMPLETED",
        message: `Detected report type ${reportType}, ingestion not implemented for this milestone.`,
        rowsProcessed: 0,
        rowsFailed: 0,
        details: {
          reason:
            reportType === "TRANSACTION_ACTIVITY"
              ? "Transaction Activity parsing is intentionally deferred until fixed-width extracted text parsing is validated."
              : "Report type detected but intentionally deferred.",
        },
      });

      return NextResponse.json(
        {
          source: "WELLS_FARGO",
          reportType,
          message: "NOT_IMPLEMENTED_FOR_THIS_REPORT_TYPE",
        },
        { status: 200 }
      );
    }

    let rowsProcessed = 0;
    let rowsFailed = 0;
    let securitiesCreated = 0;
    let securitiesUpdated = 0;
    let positionsCreated = 0;
    let positionsUpdated = 0;
    const tradesCreated = 0;
    const tradesUpdated = 0;
    const failures: string[] = [];

    if (reportType === "TAX_LOT_POSITION_PNL") {
      const {
        rows,
        positions,
        failures: parseFailures,
      } = parseWellsTaxLotCsv(rawContent, fileName);

      rowsProcessed += rows.length;
      rowsFailed += parseFailures.length;
      failures.push(...parseFailures);

      for (const position of positions) {
        if (!position.accountNumber) {
          rowsFailed += 1;
          failures.push(
            `Missing accountNumber for aggregated position ${position.securityName}`
          );
          continue;
        }

        if (!position.ticker) {
          rowsFailed += 1;
          failures.push(
            `Missing ticker for aggregated position ${position.securityName}`
          );
          continue;
        }

        let security = await prisma.security.findUnique({
          where: { ticker: position.ticker },
        });

        if (!security) {
          security = await prisma.security.create({
            data: {
              ticker: position.ticker,
              name: position.securityName,
              securityType: position.productType,
            },
          });

          securitiesCreated += 1;
        } else {
          await prisma.security.update({
            where: { id: security.id },
            data: {
              name: security.name || position.securityName,
              securityType: security.securityType || position.productType,
            },
          });

          securitiesUpdated += 1;
        }

        const positionData = {
          securityId: security.id,
          source: "WELLS_FARGO",
          accountNumber: position.accountNumber,
          custodian: "Wells Fargo",
          costBasis: position.costBasis,
          unrealizedPnl: position.unrealizedPnl,
          sourceReportDate: position.sourceReportDate
            ? new Date(position.sourceReportDate)
            : new Date(),
          sourceFileName: position.sourceFileName,
          sourceRowHash: position.sourceRowHash,
          ingestionRunId: ingestionRun.id,
          side: position.side,
          status: "ACTIVE",
          shares: position.shares,
          marketValue: position.marketValue,
          wap: position.wap,
          openedAt: position.openedAt ? new Date(position.openedAt) : undefined,
        };

        const existingPosition = await prisma.position.findFirst({
          where: {
            securityId: security.id,
            accountNumber: position.accountNumber,
            status: "ACTIVE",
          },
        });

        if (existingPosition) {
          await prisma.position.update({
            where: { id: existingPosition.id },
            data: positionData,
          });

          positionsUpdated += 1;
        } else {
          await prisma.position.create({
            data: positionData,
          });

          positionsCreated += 1;
        }
      }
    }

    const sourceReportDate = new Date();
    const finalStatus = rowsFailed > 0 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED";

    await completeIngestionRun({
      id: ingestionRun.id,
      status: finalStatus,
      message: `Wells ingestion ${reportType} completed. Processed ${rowsProcessed} rows, failed ${rowsFailed}.`,
      rowsProcessed,
      rowsFailed,
      sourceReportDate,
      accountNumber: undefined,
      details: { failures },
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

    if (ingestionRunId) {
      await completeIngestionRun({
        id: ingestionRunId,
        status: "FAILED",
        message: error instanceof Error ? error.message : "Unknown Wells ingestion error",
        rowsProcessed: 0,
        rowsFailed: 1,
        details: {
          error: error instanceof Error ? error.stack || error.message : String(error),
        },
      });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
