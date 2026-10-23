import { getAuthSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { REMINDER_STATUS } from "@/utils/constants/reminders";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = Number(session.user.id);
  const encoder = new TextEncoder();
  let lastPayload = "";

  const stream = new ReadableStream({
    async start(controller) {
      let interval: ReturnType<typeof setInterval> | undefined;
      let stopped = false;
      const stop = () => {
        stopped = true;
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      };

      const check = async () => {
        try {
          const [user, notifCount, reminderCount] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { active: true } }),
            prisma.notification.count({ where: { userId, read: false } }),
            prisma.reminder.count({
              where: {
                assignedToId: userId,
                status: REMINDER_STATUS.PENDING,
                scheduledAt: { lte: new Date() },
              },
            }),
          ]);
          if (!user?.active) return stop();

          const payload = JSON.stringify({ notifCount, reminderCount });
          if (payload !== lastPayload) {
            lastPayload = payload;
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch {
          stop();
        }
      };

      await check();
      if (!stopped) interval = setInterval(check, 15_000);

      req.signal.addEventListener("abort", stop);
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
