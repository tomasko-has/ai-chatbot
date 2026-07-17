import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import rateLimit from "express-rate-limit";
import "dotenv/config";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// create the client - it automatically reads the key from .env
const anthropic = new Anthropic();

// limits
const MAX_MESSAGE_LENGTH = 2000; // max characters per single message
const MAX_HISTORY = 50;          // max messages kept in one conversation

// rate limiter: max 20 requests per minute per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment and try again." },
});

// main chat endpoint - streams Claude's reply back piece by piece
app.post("/chat", chatLimiter, async (req, res) => {
  const messages = req.body.messages;

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

  // set up the response as a stream (Server-Sent Events style)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a friendly assistant for "Brew & Bean", a coffee shop.
You help customers with questions about the menu, opening hours, and reservations.

Coffee shop information:
- Opening hours: Monday–Friday 7:00 AM–7:00 PM, Saturday 8:00 AM–6:00 PM, Sunday closed.
- We serve espresso drinks, filter coffee, teas, homemade pastries, and breakfast.
- Free Wi-Fi, a space well suited for working.
- Reservations: by phone at (555) 123-4567.

Reply concisely and in a friendly tone, in English. If someone asks about something you don't know, admit it and suggest calling the coffee shop.`,
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