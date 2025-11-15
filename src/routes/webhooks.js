import express from "express";
import {
  createWebhook,
  deleteWebhook,
  listWebhooks,
} from "../services/webhooks.service.js";

const router = express.Router();

// POST /
router.post("/", async (req, res, next) => {
  try {
    const wh = await createWebhook(req.body || {});
    return res.status(201).json(wh);
  } catch (e) {
    next(e);
  }
});

// GET /
router.get("/", async (_req, res, next) => {
  try {
    const result = await listWebhooks();
    return res.json(result);
  } catch (e) {
    next(e);
  }
});

// DELETE /{webhookId}
router.delete("/:webhookId", async (req, res, next) => {
  try {
    await deleteWebhook(req.params.webhookId);
    return res.sendStatus(204);
  } catch (e) {
    next(e);
  }
});

export const webhooksRouter = router;
