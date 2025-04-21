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
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.setMyCommands(commands);

bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  bot.sendMessage(chatId, resp);
});

//User Commands
//Done
const userStates = {}; // To keep track of user input progress
const userTempData = {}; // To temporarily store user data

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "👋 Hi! Let's get you registered.\n\nWhat is your *first name*?", {
    parse_mode: "Markdown",
  });

  userStates[chatId] = 'awaiting_first_name';
  userTempData[chatId] = {};
});

bot.onText(/\/join/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "👋 Hi! Let's get you registered.\n\nWhat is your *first name*?", {
    parse_mode: "Markdown",
  });

  userStates[chatId] = 'awaiting_first_name';
  userTempData[chatId] = {};
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userStates[chatId]) return; // Ignore if user is not in registration flow

  switch (userStates[chatId]) {
    case 'awaiting_first_name':
      userTempData[chatId].first_name = text;
      userStates[chatId] = 'awaiting_last_name';
      bot.sendMessage(chatId, "Great! Now what's your *last name*?", { parse_mode: "Markdown" });
      break;

    case 'awaiting_last_name':
      userTempData[chatId].last_name = text;
      userStates[chatId] = 'awaiting_matric';
      bot.sendMessage(chatId, "📚 Please enter your *matric number*:", { parse_mode: "Markdown" });
      break;

    case 'awaiting_matric':
      userTempData[chatId].matric_number = text;
      userStates[chatId] = 'awaiting_level';
      bot.sendMessage(chatId, "🎓 Finally, what level are you in? (e.g., 100, 200, etc.)", {
        parse_mode: "Markdown",
      });
      break;

    case 'awaiting_level':
      userTempData[chatId].level = text;

      const userData = {
        ...userTempData[chatId],
        username: msg.from.username || "",
        is_bot: msg.from.is_bot || false,
      };

      const success = await addUser(msg.from.id.toString(), userData);

      if (success) {
        bot.sendMessage(chatId, `✅ Registration complete!\n\nWelcome *${userData.first_name}*!`, {
          parse_mode: "Markdown",
        });
      } else {
        bot.sendMessage(chatId, "⚠️ Failed to register. Please try again later.");
      }

      // Clear the state and temp data
      delete userStates[chatId];
      delete userTempData[chatId];
      break;
  }
});


bot.onText(/\/view_info/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  try {
    const db = admin.database();
    const snapshot = await db.ref(`users/${userId}`).once('value');
    const userData = snapshot.val();

    if (!userData) {
      return bot.sendMessage(chatId, "😕 No user data found. Please use /start to register.");
    }

    const info = `
🧾 *Your Information:*

*First Name:* ${userData.first_name || "Not set"}
*Last Name:* ${userData.last_name || "Not set"}
*Matric Number:* ${userData.matric_number || "Not set"}
*Level:* ${userData.level || "Not set"}
`;

    bot.sendMessage(chatId, info, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error fetching user info:", error);
    bot.sendMessage(chatId, "❌ Couldn't retrieve your info. Please try again later.");
  }
});


bot.onText(/\/update_info/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  const options = {
    reply_markup: {
      keyboard: [["First Name", "Last Name"], ["Matric Number", "Level"]],
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  };

  bot.sendMessage(chatId, "🛠 What would you like to update?", options);
  userStates[userId] = { step: 'choose_field' };
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const text = msg.text.trim();

  if (!userStates[userId]) return;

  const state = userStates[userId];

  // Step 1: Choosing which field to update
  if (state.step === 'choose_field') {
    const fieldMap = {
      "First Name": "first_name",
      "Last Name": "last_name",
      "Matric Number": "matric_number",
      "Level": "level",
    };

    const field = fieldMap[text];
    if (!field) {
      return bot.sendMessage(chatId, "❌ Please choose a valid option.");
    }

    state.field = field;
    state.step = 'enter_new_value';

    bot.sendMessage(chatId, `✏️ Enter your new *${text}*:`, { parse_mode: "Markdown" });
  }

  // Step 2: Entering new value
  else if (state.step === 'enter_new_value') {
    const db = admin.database();
    const ref = db.ref(`users/${userId}`);

    try {
      await ref.update({ [state.field]: text });
      bot.sendMessage(chatId, "✅ Info updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      bot.sendMessage(chatId, "❌ Failed to update your info.");
    }

    delete userStates[userId]; // Clear state
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

const adminStates = {}; // Track admin input state

bot.onText(/\/send_announcement/, (msg) => {
  const chatId = msg.chat.id;

  // Ask for the announcement content
  bot.sendMessage(
    chatId,
    "📢 Please type the announcement message you'd like to send to all users:"
  );

  adminStates[chatId] = 'awaiting_announcement';
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Only respond if the admin is expected to send an announcement
  if (adminStates[chatId] === 'awaiting_announcement') {
    try {
      const userIds = await getUserIds(); // Fetch all user IDs

      if (userIds.length > 0) {
        for (const userId of userIds) {
          await bot.sendMessage(userId, `📣 Announcement:\n\n${text}`);
        }

        bot.sendMessage(chatId, "✅ Announcement sent to all users.");
      } else {
        bot.sendMessage(chatId, "⚠️ No users found in the database.");
      }
    } catch (error) {
      console.error("Error sending announcements:", error);
      bot.sendMessage(chatId, "❌ There was an error sending the announcement.");
    }


    // Clear the state
    delete adminStates[chatId];
  }
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



bot.onText(/\/add_event/, (msg) => {
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

// bot.on("message", (msg) => {
//   const chatId = msg.chat.id;
//   if (!msg.text.startsWith("/")) {
//     bot.sendMessage(chatId, "Received your message");
//   }
// });

// --- Express Server Setup ---
app.get("/", (req, res) => {
  res.send("Council bot is running!");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
