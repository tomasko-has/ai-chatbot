Brew & Bean — AI Customer Assistant

A production-style AI chatbot for a small business (a coffee shop), built with Node.js and the Anthropic Claude API. It answers customer questions about opening hours, the menu, and reservations through a clean, dark-themed chat interface.

This project demonstrates a complete, reusable pattern for adding an AI assistant to any business website: the same codebase works for a café, a hair salon, or an auto shop — only the assistant's instructions change.

Features


Conversational memory — the assistant remembers earlier messages within a session and answers follow-up questions in context.
Business-specific knowledge — the assistant is scoped to a single business through a system prompt, so it only talks about what it should.
Stays factual, never invents — when asked about something it wasn't given (for example an exact price), it admits it doesn't know and points the customer to a phone number instead of guessing. This is the behaviour businesses need most from a customer-facing bot.
Clean dark UI — modern interface with a typing indicator, smooth message animations, and an online-status header.
Secure by design — the API key lives in an environment variable on the server and is never exposed to the browser.


Tech Stack


Backend: Node.js, Express
AI: Anthropic Claude API (@anthropic-ai/sdk)
Frontend: vanilla HTML, CSS, and JavaScript (no framework needed)
Config: dotenv for environment variables


How It Works

The app follows the standard pattern for AI applications:


The browser sends the user's message (plus the conversation so far) to the backend.
The backend forwards the conversation to the Claude API, along with a system prompt that defines the assistant's role and knowledge.
Claude returns a reply, which the backend passes back to the browser.
The frontend displays it and keeps the running conversation in memory.