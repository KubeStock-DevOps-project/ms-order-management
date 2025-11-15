const { v4: uuidv4 } = require("uuid");
const prisma = require("../prisma");
const { toApiWebhook } = require("../utils/mappers");

async function createWebhook(body) {
  const wh = await prisma.webhook.create({
    data: {
      id: uuidv4(),
      url: body.url,
      events: Array.isArray(body.events) ? body.events : [],
      secret: body.secret,
    },
  });
  return toApiWebhook(wh);
}

async function listWebhooks() {
  const list = await prisma.webhook.findMany({
    orderBy: { createdAt: "desc" },
  });
  return { webhooks: list.map(toApiWebhook) };
}

async function deleteWebhook(id) {
  const del = await prisma.webhook.delete({ where: { id } }).catch(() => null);
  if (!del) {
    const e = new Error("Webhook not found");
    e.status = 404;
    e.code = "NOT_FOUND";
    throw e;
  }
}

module.exports = { createWebhook, listWebhooks, deleteWebhook };
