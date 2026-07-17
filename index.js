import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// create the client - it automatically reads the key from .env
const anthropic = new Anthropic();

// main chat endpoint - streams Claude's reply back piece by piece
app.post("/chat", async (req, res) => {
  const messages = req.body.messages;

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

    // as each piece of text arrives from Claude, send it to the browser
    stream.on("text", (textChunk) => {
      res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
    });

    // when Claude is done, tell the browser and close the stream
    stream.on("end", () => {
      res.write("data: [DONE]\n\n");
      res.end();
    });

    // if something breaks mid-stream
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