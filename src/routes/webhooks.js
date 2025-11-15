const express = require("express");
const webhooksService = require("../services/webhooks.service");

const router = express.Router();

// POST /
router.post("/", async (req, res, next) => {
  try {
    const wh = await webhooksService.createWebhook(req.body || {});
    return res.status(201).json(wh);
  } catch (e) {
    next(e);
  }
});

// GET /
router.get("/", async (_req, res, next) => {
  try {
    const result = await webhooksService.listWebhooks();
    return res.json(result);
  } catch (e) {
    next(e);
  }
});

// DELETE /{webhookId}
router.delete("/:webhookId", async (req, res, next) => {
  try {
    await webhooksService.deleteWebhook(req.params.webhookId);
    return res.sendStatus(204);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
