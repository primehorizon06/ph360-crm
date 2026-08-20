import { prisma } from "@/lib/prisma";
import { UserRole } from "@/utils/constants/roles";

export async function applyApprovalDecision({
  leadId,
  productId,
  action,
  isFirstProduct,
  note,
}: {
  leadId: number;
  productId: number;
  action: "APPROVE" | "REJECT";
  isFirstProduct: boolean;
  note?: string;
}): Promise<void> {
  if (action === "APPROVE" && isFirstProduct) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        type: "customer",
        conversionStatus: "APPROVED",
        convertedAt: new Date(),
      },
    });
  }

  if (action === "REJECT" && isFirstProduct) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        conversionStatus: "REJECTED",
        conversionNote: note,
      },
    });
  }

  if (action === "REJECT") {
    await prisma.product.update({
      where: { id: productId },
      data: { status: "SUSPENDED" },
    });
  }
}

export async function notifyLeadReviewers({
  leadId,
  productId,
  title,
  body,
}: {
  leadId: number;
  productId: number;
  title: string;
  body: string;
}): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { companyId: true, teamId: true },
  });

  if (!lead) return;

  const reviewers = await prisma.user.findMany({
    where: {
      OR: [
        { teamId: lead.teamId, role: UserRole.COACH },
        { companyId: lead.companyId, role: UserRole.SUPERVISOR },
      ],
    },
    select: { id: true },
  });

  if (reviewers.length === 0) return;

  await prisma.notification.createMany({
    data: reviewers.map((reviewer) => ({
      userId: reviewer.id,
      type: "PRODUCT_APPROVAL_PENDING",
      title,
      body,
      leadId,
      productId,
    })),
  });
}

export async function notifyReviewersOfResubmit(
  leadId: number,
  productId: number,
): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { firstName: true, lastName: true },
  });

  if (!lead) return;

  const leadName = `${lead.firstName} ${lead.lastName ?? ""}`.trim();
  await notifyLeadReviewers({
    leadId,
    productId,
    title: "Producto reenviado para aprobación",
    body: `${leadName} ha corregido y reenviado un producto para tu revisión.`,
  });
}
