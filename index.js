const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const commands = require("./data/commands");

const app = express();
const port = process.env.PORT || 3000;

require("dotenv").config();

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"), // 👈 important
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.CLIENT_CERT_URL,
  }),
});

// --- Telegram Bot Setup ---
const token = "7593576825:AAEUY32s8UobaUlSO7T7UPF8ZlOAQ72vYw4";
const bot = new TelegramBot(token, { polling: true });

bot.setMyCommands(commands);

bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  bot.sendMessage(chatId, resp);
});

//User Commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Covenant University Telegram Bot");
});

bot.onText(/\/help/, (msg) => {
  const helpMessage = `
👋 *Welcome to the Covenant University Student Council Bot!*

Here are the commands you can use:

📢 /announcements – View the latest updates from the Student Council  
📅 /events – See upcoming school events and activities  
🗳 /poll – Participate in ongoing polls or vote on issues  
💡 /suggest – Share your suggestions or ideas  
❓ /faq – Get answers to common questions  
✉️ /contact – Contact the Student Council (you can stay anonymous)  
🎉 /fun – Get daily quotes, fun facts, or trivia  
📚 /help – Show this help message again

_Type a command to get started. We're here to help make your school experience better!_

— *Covenant University Student Council*
    `;

  bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: "Markdown" });
});

bot.onText(/\/choose/, (msg) => {
  const chatId = msg.chat.id; // Get the chat ID of the user

  bot.sendMessage(chatId, "Choose:", {
    reply_markup: {
      keyboard: [
        ["Option 1"], // first row with one button
        ["Option 2"], // second row with one button
      ],
      resize_keyboard: true, // Automatically resizes the keyboard
      one_time_keyboard: true, // Keyboard disappears after the user selects an option
    },
  });
});

bot.onText(/\/inline/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Pick one:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Google", url: "https://google.com" }],
        [{ text: "Click Me", callback_data: "clicked" }],
      ],
    },
  });
});

bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  bot.sendMessage(chatId, `You clicked: ${data}`);
});

//Admin Commands
bot.onText(/\/admin/, (msg) => {
  const adminMessage = `
*Admin Commands:*
1. /add_user – Add a new user to the system
2. /remove_user – Remove a user from the system
3. /view_users – View all registered users
4. /send_message – Send a message to all users
5. /view_feedback – View feedback from users
6. /view_suggestions – View suggestions from users

7. /view_polls – View ongoing polls
`;
  bot.sendMessage(msg.chat.id, adminMessage, { parse_mode: "Markdown" });
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  if (!msg.text.startsWith("/")) {
    bot.sendMessage(chatId, "Received your message");
  }
});

// --- Express Server Setup ---
app.get("/", (req, res) => {
  res.send("Council bot is running!");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
