import "server-only";

import { ApplicationStage, AuditAction, CRM } from "@/generated/prisma/enums";
import { appendSheetRow, getSheetCell, getSheetRows } from "./google-sheets";
import { prisma, hasDatabaseUrl } from "./db";
import { createCompanyUpdateNotifications } from "./notifications-source";

const COMPANY_UPDATES_SHEET = "Company_Updates";
const COMPANY_UPDATE_HEADERS = [
  "Update ID",
  "Company ID",
  "Company Name",
  "Update Date",
  "Update Text",
  "Created By",
  "Created At",
  "Source",
];

export type CompanyDailyUpdate = {
  id: string;
  companyId: string;
  companyName: string;
  content: string;
  updateDate: string;
  authorName: string;
  createdAt: string;
};

export async function getCompanyUpdates(companyId: string): Promise<CompanyDailyUpdate[]> {
  if (hasDatabaseUrl()) {
    const updates = await prisma.companyUpdate.findMany({
      where: { companyId },
      orderBy: { updateDate: "desc" },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    return updates.map((update) => ({
      id: update.id,
      companyId: update.companyId,
      companyName: update.company.name,
      content: update.content,
      updateDate: update.updateDate.toISOString(),
      authorName: update.author?.name || update.author?.email || "Superadmin",
      createdAt: update.createdAt.toISOString(),
    }));
  }

  const sheet = await getSheetRows(COMPANY_UPDATES_SHEET);

  if (sheet.skipped) {
    return [];
  }

  return sheet.rows
    .filter((row) => getSheetCell(row, "Company ID", 1) === companyId)
    .map((row) => ({
      id: getSheetCell(row, "Update ID", 0) || `sheet-update-${row.rowNumber}`,
      companyId: getSheetCell(row, "Company ID", 1),
      companyName: getSheetCell(row, "Company Name", 2),
      updateDate: getSheetCell(row, "Update Date", 3),
      content: getSheetCell(row, "Update Text", 4),
      authorName: getSheetCell(row, "Created By", 5),
      createdAt: getSheetCell(row, "Created At", 6),
    }))
    .sort((a, b) => timestamp(b.updateDate || b.createdAt) - timestamp(a.updateDate || a.createdAt));
}

export async function getRecentCompanyUpdates(limit = 6): Promise<CompanyDailyUpdate[]> {
  if (hasDatabaseUrl()) {
    const updates = await prisma.companyUpdate.findMany({
      orderBy: { updateDate: "desc" },
      take: limit,
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    return updates.map((update) => ({
      id: update.id,
      companyId: update.companyId,
      companyName: update.company.name,
      content: update.content,
      updateDate: update.updateDate.toISOString(),
      authorName: update.author?.name || update.author?.email || "Superadmin",
      createdAt: update.createdAt.toISOString(),
    }));
  }

  const sheet = await getSheetRows(COMPANY_UPDATES_SHEET);

  if (sheet.skipped) {
    return [];
  }

  return sheet.rows
    .map((row) => ({
      id: getSheetCell(row, "Update ID", 0) || `sheet-update-${row.rowNumber}`,
      companyId: getSheetCell(row, "Company ID", 1),
      companyName: getSheetCell(row, "Company Name", 2),
      updateDate: getSheetCell(row, "Update Date", 3),
      content: getSheetCell(row, "Update Text", 4),
      authorName: getSheetCell(row, "Created By", 5),
      createdAt: getSheetCell(row, "Created At", 6),
    }))
    .sort((a, b) => timestamp(b.updateDate || b.createdAt) - timestamp(a.updateDate || a.createdAt))
    .slice(0, limit);
}

export async function createCompanyUpdate(input: {
  companyId: string;
  companyName: string;
  content: string;
  authorId?: string;
  authorName: string;
}) {
  const updateDate = new Date();
  const updateText = formatDailyUpdate(input.content, updateDate);
  const created = hasDatabaseUrl()
    ? await createCompanyUpdateInDatabase({
        companyId: input.companyId,
        companyName: input.companyName,
        content: updateText,
        updateDate,
        authorId: input.authorId,
      })
    : null;
  const updateId = created?.id || `UPD-${updateDate.getTime()}`;
  const sheetResult = await appendSheetRow(
    COMPANY_UPDATES_SHEET,
    {
      "Update ID": updateId,
      "Company ID": input.companyId,
      "Company Name": input.companyName,
      "Update Date": formatSheetDate(updateDate),
      "Update Text": updateText,
      "Created By": input.authorName,
      "Created At": updateDate.toISOString(),
      Source: "Dashboard",
    },
    COMPANY_UPDATE_HEADERS,
  );

  if (created && !sheetResult.skipped) {
    await prisma.companyUpdate.update({
      where: { id: created.id },
      data: { syncedToSheet: true },
    });
  }

  if (hasDatabaseUrl()) {
    if (created) {
      await createCompanyUpdateNotifications({
        companyId: input.companyId,
        companyName: input.companyName,
        companyUpdateId: created.id,
        authorId: input.authorId,
        content: updateText,
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: input.authorId,
        entityType: "Company",
        entityId: input.companyId,
        action: AuditAction.COMPANY_UPDATE,
        message: `${input.authorName} added a daily update for ${input.companyName}.`,
        after: {
          content: updateText,
          syncedToSheet: !sheetResult.skipped,
        },
      },
    });
  }

  return {
    update: {
      id: updateId,
      companyId: input.companyId,
      companyName: input.companyName,
      content: updateText,
      updateDate: updateDate.toISOString(),
      authorName: input.authorName,
      createdAt: updateDate.toISOString(),
    } satisfies CompanyDailyUpdate,
    sheetResult,
  };
}

async function createCompanyUpdateInDatabase(input: {
  companyId: string;
  companyName: string;
  content: string;
  updateDate: Date;
  authorId?: string;
}) {
  await prisma.company.upsert({
    where: { id: input.companyId },
    update: {
      name: input.companyName,
    },
    create: {
      id: input.companyId,
      name: input.companyName,
      techStack: [],
      rounds: [
        ApplicationStage.APPLIED,
        ApplicationStage.SELECTED,
        ApplicationStage.REJECTED,
        ApplicationStage.DROPPED,
      ],
      crm: CRM.GOOGLE_SHEETS,
      remarks: "Created automatically for daily company updates.",
    },
  });

  return prisma.companyUpdate.create({
    data: {
      companyId: input.companyId,
      content: input.content,
      updateDate: input.updateDate,
      authorId: input.authorId,
    },
  });
}

function formatDailyUpdate(content: string, date: Date) {
  const trimmed = content.trim();

  if (/recent update on\s*:/i.test(trimmed)) {
    return trimmed;
  }

  return `Recent Update on : ${formatSheetDate(date)}\n\n${trimmed}`;
}

function formatSheetDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function timestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
