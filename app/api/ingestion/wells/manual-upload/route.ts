import { NextResponse } from "next/server";
import { parseWellsTransactionActivityCsv } from "@/lib/ingestion/wells-transaction-activity";
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
    reportType === "PORTFOLIO_RISK_EXPOSURE"
  ) {
      await completeIngestionRun({
        id: ingestionRun.id,
        status: "COMPLETED",
        message: `Detected report type ${reportType}, ingestion not implemented for this milestone.`,
        rowsProcessed: 0,
        rowsFailed: 0,
        
        details: {
          reason: "Report type detected but intentionally deferred.",
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
    let tradesCreated = 0;
    let tradesUpdated = 0;
    
    let taxLotsCreated = 0;
    let taxLotsUpdated = 0;

    const failures: string[] = [];

    if (reportType === "TAX_LOT_POSITION_PNL") {
      
      const {
        rows,
        positions,
        taxLots,
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

      for (const taxLot of taxLots) {
        if (!taxLot.accountNumber) {
          rowsFailed += 1;
          failures.push(`Missing accountNumber for tax lot ${taxLot.securityName}`);
          continue;
        }

        if (!taxLot.ticker) {
          rowsFailed += 1;
          failures.push(`Missing ticker for tax lot ${taxLot.securityName}`);
          continue;
        }

        let security = await prisma.security.findUnique({
          where: {
            ticker: taxLot.ticker,
          },
        });

        if (!security) {
          security = await prisma.security.create({
            data: {
              ticker: taxLot.ticker,
              name: taxLot.securityName,
              securityType: taxLot.productType ?? null,
            },
          });

          securitiesCreated += 1;
        } else {
          await prisma.security.update({
            where: {
              id: security.id,
            },
            data: {
              name: security.name || taxLot.securityName,
              securityType: security.securityType || taxLot.productType || null,
            },
          });

          securitiesUpdated += 1;
        }

        const matchingPosition = await prisma.position.findFirst({
          where: {
            securityId: security.id,
            accountNumber: taxLot.accountNumber,
            source: "WELLS_FARGO",
            status: "ACTIVE",
          },
        });

        const existingTaxLot = await prisma.taxLot.findUnique({
          where: {
            sourceRowHash: taxLot.sourceRowHash,
          },
        });

        const taxLotData = {
          securityId: security.id,
          positionId: matchingPosition?.id ?? null,
          accountNumber: taxLot.accountNumber,
          taxLotId: taxLot.taxLotId ?? null,
          taxLotDate: taxLot.taxLotDate ? new Date(taxLot.taxLotDate) : null,
          quantity: taxLot.quantity,
          unitCost: taxLot.unitCost ?? null,
          marketPrice: taxLot.marketPrice ?? null,
          costBasis: taxLot.costBasis,
          marketValue: taxLot.marketValue,
          unrealizedPnl: taxLot.unrealizedPnl,
          roi: taxLot.roi ?? null,
          holdingPeriod: taxLot.holdingPeriod ?? null,
          daysToLongTerm: taxLot.daysToLongTerm ?? null,
          source: "WELLS_FARGO",
          sourceFileName: taxLot.sourceFileName ?? null,
          sourceRowHash: taxLot.sourceRowHash,
          sourceReportDate: taxLot.sourceReportDate
            ? new Date(taxLot.sourceReportDate)
            : null,
          ingestionRunId: ingestionRun.id,
        };

        if (existingTaxLot) {
          await prisma.taxLot.update({
            where: {
              id: existingTaxLot.id,
            },
            data: taxLotData,
          });

          taxLotsUpdated += 1;
        } else {
          await prisma.taxLot.create({
            data: taxLotData,
          });

          taxLotsCreated += 1;
        }
      }

    }

    if (reportType === "TRANSACTION_ACTIVITY") {
        const {
          rows,
          failures: parseFailures,
        } = parseWellsTransactionActivityCsv(rawContent, fileName);

        rowsProcessed += rows.length;
        rowsFailed += parseFailures.length;
        failures.push(...parseFailures);

        const supportedTradeTypes = new Set(["BUY", "SELL", "SHORT", "COVER"]);

        for (const trade of rows) {
          if (!supportedTradeTypes.has(trade.tradeType || "")) {
            continue;
          }

          if (!trade.accountNumber) {
            rowsFailed += 1;
            failures.push(`Missing accountNumber for trade ${trade.transactionId}`);
            continue;
          }

          if (!trade.ticker) {
            rowsFailed += 1;
            failures.push(
              `Missing ticker for trade ${trade.transactionId || trade.securityName}`
            );
            continue;
          }

          if (!trade.tradeDate) {
            rowsFailed += 1;
            failures.push(`Missing tradeDate for trade ${trade.transactionId}`);
            continue;
          }

          if (trade.quantity == null) {
            rowsFailed += 1;
            failures.push(`Missing quantity for trade ${trade.transactionId}`);
            continue;
          }

          let security = await prisma.security.findUnique({
            where: {
              ticker: trade.ticker,
            },
          });

          if (!security) {
            security = await prisma.security.create({
              data: {
                ticker: trade.ticker,
                name: trade.securityName || trade.ticker,
                wellsSecurityId: trade.wfSecId,
                cusip: trade.cusip,
                isin: trade.isin,
                sedol: trade.sedol,
              },
            });

            securitiesCreated += 1;
          } else {
            await prisma.security.update({
              where: {
                id: security.id,
              },
              data: {
                name: security.name || trade.securityName || trade.ticker,
                wellsSecurityId: security.wellsSecurityId || trade.wfSecId,
                cusip: security.cusip || trade.cusip,
                isin: security.isin || trade.isin,
                sedol: security.sedol || trade.sedol,
              },
            });

            securitiesUpdated += 1;
          }

          const matchingPosition = await prisma.position.findFirst({
            where: {
              securityId: security.id,
              accountNumber: trade.accountNumber,
              source: "WELLS_FARGO",
              status: "ACTIVE",
            },
          });

          const tradeData = {
            securityId: security.id,
            positionId: matchingPosition?.id,
            dateTraded: new Date(trade.tradeDate),
            shares: trade.quantity,
            avgPrice: trade.price ?? 0,
            tradeType: trade.tradeType,
            settlementDate: trade.settlementDate
              ? new Date(trade.settlementDate)
              : undefined,
            postDate: trade.postDate ? new Date(trade.postDate) : undefined,
            notional:
              trade.price != null && trade.quantity != null
                ? trade.price * trade.quantity
                : undefined,
            commission: trade.commission,
            fees: trade.fees,
            accruedInterest: trade.accruedInterest,
            netAmount: trade.netAmount,
            currency: trade.currency,
            transactionId: trade.transactionId,
            clientReferenceId: trade.clientReferenceId,
            source: "WELLS_FARGO",
            sourceFileName: trade.sourceFileName,
            sourceRowHash: trade.sourceRowHash,
            sourceReportDate: trade.sourceReportDate
              ? new Date(trade.sourceReportDate)
              : undefined,
            ingestionRunId: ingestionRun.id,
          };

          const existingTrade = await prisma.trade.findFirst({
            where: {
              sourceRowHash: trade.sourceRowHash,
            },
          });

          if (existingTrade) {
            await prisma.trade.update({
              where: {
                id: existingTrade.id,
              },
              data: tradeData,
            });

            tradesUpdated += 1;
          } else {
            await prisma.trade.create({
              data: tradeData,
            });

            tradesCreated += 1;
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
      taxLotsCreated,
      taxLotsUpdated,
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
