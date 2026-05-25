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

export async function notifyCoachOfResubmit(
  leadId: number,
  productId: number,
): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { firstName: true, lastName: true, teamId: true },
  });

  if (!lead) return;

  const coach = await prisma.user.findFirst({
    where: { teamId: lead.teamId, role: UserRole.COACH },
    select: { id: true },
  });

  if (!coach) return;

  const leadName = `${lead.firstName} ${lead.lastName ?? ""}`.trim();
  await prisma.notification.create({
    data: {
      userId: coach.id,
      type: "PRODUCT_APPROVAL_PENDING",
      title: "Producto reenviado para aprobación",
      body: `${leadName} ha corregido y reenviado un producto para tu revisión.`,
      leadId,
      productId,
    },
  });
}
