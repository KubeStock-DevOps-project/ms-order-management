import { v4 as uuidv4 } from "uuid";
import { prisma } from "../prisma.js";
import { toApiWebhook } from "../utils/mappers.js";

export const createWebhook = async (body) => {
  const wh = await prisma.webhook.create({
    data: {
      id: uuidv4(),
      url: body.url,
      events: Array.isArray(body.events) ? body.events : [],
      secret: body.secret,
    },
  });
  return toApiWebhook(wh);
};

export const listWebhooks = async () => {
  const list = await prisma.webhook.findMany({
    orderBy: { createdAt: "desc" },
  });
  return { webhooks: list.map(toApiWebhook) };
};

export const deleteWebhook = async (id) => {
  const del = await prisma.webhook.delete({ where: { id } }).catch(() => null);
  if (!del) {
    const e = new Error("Webhook not found");
    e.status = 404;
    e.code = "NOT_FOUND";
    throw e;
  }
};
