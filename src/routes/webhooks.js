const express = require("express");
const webhooksService = require("../services/webhooks.service");

const router = express.Router();

// POST /webhooks
router.post("/webhooks", async (req, res, next) => {
  try {
    const wh = await webhooksService.createWebhook(req.body || {});
    return res.status(201).json(wh);
  } catch (e) {
    next(e);
  }
});

// GET /webhooks
router.get("/webhooks", async (_req, res, next) => {
  try {
    const result = await webhooksService.listWebhooks();
    return res.json(result);
  } catch (e) {
    next(e);
  }
});

// DELETE /webhooks/{webhookId}
router.delete("/webhooks/:webhookId", async (req, res, next) => {
  try {
    await webhooksService.deleteWebhook(req.params.webhookId);
    return res.sendStatus(204);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
