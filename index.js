import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { businesses, DEFAULT_BUSINESS } from "./businesses.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// create the client - it automatically reads the key from .env
const anthropic = new Anthropic();

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 50;

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment and try again." },
});

// lets the frontend fetch the list of businesses (id, name, emoji, welcome)
app.get("/businesses", (req, res) => {
  const list = Object.values(businesses).map((b) => ({
    id: b.id,
    name: b.name,
    emoji: b.emoji,
    welcome: b.welcome,
  }));
  res.json({ businesses: list, default: DEFAULT_BUSINESS });
});

// main chat endpoint - streams Claude's reply back piece by piece
app.post("/chat", chatLimiter, async (req, res) => {
  const messages = req.body.messages;
  const businessId = req.body.businessId;

  // pick the business personality (fallback to default if invalid)
  const business = businesses[businessId] || businesses[DEFAULT_BUSINESS];

  // --- validation ---
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No messages provided." });
  }
  if (messages.length > MAX_HISTORY) {
    return res.status(400).json({ error: "Conversation is too long. Please start a new chat." });
  }
  const lastMessage = messages[messages.length - 1];
  const lastText = (lastMessage && typeof lastMessage.content === "string") ? lastMessage.content.trim() : "";
  if (!lastText) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }
  if (lastText.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` });
  }
  // --- end validation ---

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: business.systemPrompt,   // personality comes from the chosen business
      messages: messages,
    });

    stream.on("text", (textChunk) => {
      res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
    });

    stream.on("end", () => {
      res.write("data: [DONE]\n\n");
      res.end();
    });

    stream.on("error", (error) => {
      console.error(error);
      res.write(`data: ${JSON.stringify({ error: "Something went wrong" })}\n\n`);
      res.end();
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});