import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// create the client - it automatically reads the key from .env
const anthropic = new Anthropic();

// main chat endpoint - sends the whole conversation to Claude and returns the reply
app.post("/chat", async (req, res) => {
  const messages = req.body.messages;

  try {
    const response = await anthropic.messages.create({
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

    const reply = response.content[0].text;
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});