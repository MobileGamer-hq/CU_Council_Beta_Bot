const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const path = require("path");
const fs = require("fs");
const commands = require("./data/commands");
const { adminMessage } = require("./data/messages");
const { getUserIds, addUser } = require("./utilities/database");

const app = express();
const port = process.env.PORT || 3000;

require("dotenv").config();

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
//Done
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  const userData = {
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    username: user.username || "",
    is_bot: user.is_bot || false,
  };

  const success = await addUser(user.id.toString(), userData);

  if (success) {
    bot.sendMessage(
      chatId,
      `👋 Welcome, *${user.first_name || "there"}*! You have been registered.`,
      {
        parse_mode: "Markdown",
      }
    );
  } else {
    bot.sendMessage(
      chatId,
      `⚠️ Something went wrong while registering you. Please try again later.`
    );
  }
});

//Done
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

bot.onText(/\/events/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Covenant University Telegram Bot");
});

bot.onText(/\/contact/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Covenant University Telegram Bot");
});

bot.onText(/\/contacts/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Covenant University Telegram Bot");
});

bot.onText(/\/suggest/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Covenant University Telegram Bot");
});

//Done
bot.onText(/\/timetable/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Which timetable would you like to view?", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📚 Academic Timetable",
            callback_data: "academic_timetable",
          },
        ],
        [
          {
            text: "🗓️ Semester Timetable",
            callback_data: "semester_timetable",
          },
        ],
        [{ text: "📝 Exam Timetable", callback_data: "exam_timetable" }],
      ],
    },
  });
});

//Admin Commands
bot.onText(/\/admin/, (msg) => {
  bot.sendMessage(msg.chat.id, adminMessage, { parse_mode: "Markdown" });
});

bot.onText(/\/add_users/, (msg) => {
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Add User", callback_data: "add_user" }],
        [{ text: "➖ Remove User", callback_data: "remove_user" }],
      ],
    },
    parse_mode: "Markdown",
  };

  bot.sendMessage(msg.chat.id, "*Admin Panel*", opts);
});

bot.onText(/\/send_announcement/, async (msg) => {
  const chatId = msg.chat.id;

  // Send a confirmation message to the admin
  bot.sendMessage(
    chatId,
    "Welcome to Covenant University Telegram Bot. Preparing to send announcements..."
  );

  try {
    const userIds = await getUserIds(); // Fetch all user IDs

    if (userIds.length > 0) {
      // Send announcement to each user
      userIds.forEach((userId) => {
        bot.sendMessage(
          userId,
          "This is a test announcement from Covenant University Telegram Bot!"
        );
      });

      bot.sendMessage(chatId, "Announcements sent to all users.");
    } else {
      bot.sendMessage(chatId, "No users found in the database.");
    }
  } catch (error) {
    console.error("Error sending announcements:", error);
    bot.sendMessage(chatId, "There was an error sending the announcements.");
  }
});

bot.onText(/\/add_event/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Covenant University Telegram Bot");
});

bot.onText(/\/send_announcements/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Covenant University Telegram Bot");
});

bot.onText(/\/update_contacts/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Covenant University Telegram Bot");
});

//Done But needs to send to multiple users
bot.onText(/\/create_poll/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "What type of poll would you like to create?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Yes/No Poll", callback_data: "yes_no_poll" }],
        [
          {
            text: "Multiple Choice Poll",
            callback_data: "multiple_choice_poll",
          },
        ],
      ],
    },
  });
});

//

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

//Callback Query
bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  // Handle the Timetable selection
  if (data === "academic_timetable") {
    const filePath = path.join(__dirname, "files", "academic_timetable.pdf");
    bot.sendDocument(chatId, fs.createReadStream(filePath));
  } else if (data === "semester_timetable") {
    const filePath = path.join(__dirname, "files", "semester_timetable.pdf");
    bot.sendDocument(chatId, fs.createReadStream(filePath));
  } else if (data === "exam_timetable") {
    const filePath = path.join(__dirname, "files", "exam_timetable.pdf");
    bot.sendDocument(chatId, fs.createReadStream(filePath));
  }

  // Poll creation
  if (data === "yes_no_poll") {
    bot.sendMessage(
      chatId,
      "Please send me the question for your Yes/No poll."
    );
    bot.once("message", (msg) => {
      const question = msg.text;
      bot.sendMessage(chatId, "Please send the first option (e.g., 'Yes').");
      bot.once("message", (msg) => {
        const option1 = msg.text;
        bot.sendMessage(chatId, "Please send the second option (e.g., 'No').");
        bot.once("message", (msg) => {
          const option2 = msg.text;

          // Create the Yes/No poll
          bot.sendPoll(chatId, question, [option1, option2]);
        });
      });
    });
  } else if (data === "multiple_choice_poll") {
    bot.sendMessage(chatId, "Please send me the question for your poll.");
    bot.once("message", (msg) => {
      const question = msg.text;
      bot.sendMessage(
        chatId,
        "Please send the options for the poll, separated by commas."
      );
      bot.once("message", (msg) => {
        const options = msg.text.split(",");

        // Create the multiple choice poll
        bot.sendPoll(chatId, question, options);
      });
    });
  }

  // Acknowledge the callback
  bot.answerCallbackQuery(callbackQuery.id);
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
