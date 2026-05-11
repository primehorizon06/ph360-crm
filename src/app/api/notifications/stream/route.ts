import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = Number(session.user.id);
  const encoder = new TextEncoder();
  let lastPayload = "";

  const stream = new ReadableStream({
    async start(controller) {
      const check = async () => {
        try {
          const [notifCount, reminderCount] = await Promise.all([
            prisma.notification.count({ where: { userId, read: false } }),
            prisma.reminder.count({
              where: {
                assignedToId: userId,
                status: "PENDING",
                scheduledAt: { lte: new Date() },
              },
            }),
          ]);

          const payload = JSON.stringify({ notifCount, reminderCount });
          if (payload !== lastPayload) {
            lastPayload = payload;
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch {
          try { controller.close(); } catch { /* already closed */ }
        }
      };

      await check();
      const interval = setInterval(check, 15_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
