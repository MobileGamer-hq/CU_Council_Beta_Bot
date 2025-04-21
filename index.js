const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const path = require("path");
const fs = require("fs");
const {commands, adminCommands} = require("./data/commands");
const { adminMessage } = require("./data/messages");
const admin = require("./utilities/firebase"); // Import the firebase admin SDK
const { getUserIds, addUser, getUser, addAdminByMatricNumber } = require("./utilities/database");

const app = express();
const port = process.env.PORT || 3000;

require("dotenv").config();

// --- Telegram Bot Setup ---
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

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

  bot.sendMessage(
    chatId,
    "👋 Hi! Let's get you registered.\n\nWhat is your *first name*?",
    {
      parse_mode: "Markdown",
    }
  );

  userStates[chatId] = "awaiting_first_name";
  userTempData[chatId] = {};
});

bot.onText(/\/join/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "👋 Hi! Let's get you registered.\n\nWhat is your *first name*?",
    {
      parse_mode: "Markdown",
    }
  );

  userStates[chatId] = "awaiting_first_name";
  userTempData[chatId] = {};
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userStates[chatId]) return; // Ignore if user is not in registration flow

  switch (userStates[chatId]) {
    case "awaiting_first_name":
      userTempData[chatId].first_name = text;
      userStates[chatId] = "awaiting_last_name";
      bot.sendMessage(chatId, "Great! Now what's your *last name*?", {
        parse_mode: "Markdown",
      });
      break;

    case "awaiting_last_name":
      userTempData[chatId].last_name = text;
      userStates[chatId] = "awaiting_matric";
      bot.sendMessage(chatId, "📚 Please enter your *matric number*:", {
        parse_mode: "Markdown",
      });
      break;

    case "awaiting_matric":
      userTempData[chatId].matric_number = text;
      userStates[chatId] = "awaiting_level";
      bot.sendMessage(
        chatId,
        "🎓 Finally, what level are you in? (e.g., 100, 200, etc.)",
        {
          parse_mode: "Markdown",
        }
      );
      break;

    case "awaiting_level":
      userTempData[chatId].level = text;

      const userData = {
        ...userTempData[chatId],
        username: msg.from.username || "",
        is_bot: msg.from.is_bot || false,
      };

      const success = await addUser(msg.from.id.toString(), userData);

      if (success) {
        bot.sendMessage(
          chatId,
          `✅ Registration complete!\n\nWelcome *${userData.first_name}*!`,
          {
            parse_mode: "Markdown",
          }
        );
      } else {
        bot.sendMessage(
          chatId,
          "⚠️ Failed to register. Please try again later."
        );
      }

      // Clear the state and temp data
      delete userStates[chatId];
      delete userTempData[chatId];

      try {
        // Fetch admin list from Firebase
        const snapshot = await admin.database().ref("admins").once("value");
        const adminList = snapshot.val() || {};
        const isAdmin = adminList[chatId];
    
        // Check if the user is an admin and update the bot's commands accordingly
        if (isAdmin) {
          await bot.setMyCommands(adminCommands);
          return bot.sendMessage(chatId, "🔐 Welcome Admin! You now have access to admin commands.");
        } else {
          await bot.setMyCommands(commands);
          return bot.sendMessage(chatId, "👋 Use /help to explore what I can do.");
        }
      } catch (err) {
        console.error("Failed to fetch admin list:", err);
        return bot.sendMessage(chatId, "⚠️ An error occurred while checking your role.");
      }

      break;
  }
});

bot.onText(/\/view_info/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  try {
    const userData = await getUser(userId);

    if (!userData) {
      return bot.sendMessage(
        chatId,
        "😕 No user data found. Please use /start to register."
      );
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
    bot.sendMessage(
      chatId,
      "❌ Couldn't retrieve your info. Please try again later."
    );
  }
});

bot.onText(/\/update_info/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  const options = {
    reply_markup: {
      keyboard: [
        ["First Name", "Last Name"],
        ["Matric Number", "Level"],
      ],
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  };

  bot.sendMessage(chatId, "🛠 What would you like to update?", options);
  userStates[userId] = { step: "choose_field" };
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const text = msg.text.trim();

  if (!userStates[userId]) return;

  const state = userStates[userId];

  // Step 1: Choosing which field to update
  if (state.step === "choose_field") {
    const fieldMap = {
      "First Name": "first_name",
      "Last Name": "last_name",
      "Matric Number": "matric_number",
      Level: "level",
    };

    const field = fieldMap[text];
    if (!field) {
      return bot.sendMessage(chatId, "❌ Please choose a valid option.");
    }

    state.field = field;
    state.step = "enter_new_value";

    bot.sendMessage(chatId, `✏️ Enter your new *${text}*:`, {
      parse_mode: "Markdown",
    });
  }

  // Step 2: Entering new value
  else if (state.step === "enter_new_value") {
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



const contactSessions = {}; // temp in-memory store for contact flow

bot.onText(/\/contact/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  contactSessions[userId] = { step: "awaiting_message" };

  bot.sendMessage(
    chatId,
    `📬 *Contact Management*\n\nYou can send a message to school officials. This message can be sent anonymously or with your details (name & matric number).\n\nPlease type your message below:`,
    { parse_mode: "Markdown" }
  );
});

// Listen for user's message after /contact
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Ignore /contact command itself
  if (msg.text.toLowerCase().startsWith("/contact")) return;

  const session = contactSessions[userId];

  if (session?.step === "awaiting_message") {
    contactSessions[userId].message = msg.text;
    contactSessions[userId].step = "awaiting_identity_choice";

    return bot.sendMessage(
      chatId,
      `🕵️‍♂️ Would you like to send this message anonymously or with your name and matric number?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Send Anonymously", callback_data: "send_anonymous" },
              { text: "👤 Attach My Info", callback_data: "send_with_info" },
            ],
          ],
        },
      }
    );
  }
});

// Handle button press
bot.on("callback_query", async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const data = query.data;
  const session = contactSessions[userId];

  if (!session || session.step !== "awaiting_identity_choice") return;

  // Fetch user info if needed
  const db = admin.database();
  const snapshot = await db.ref(`users/${userId}`).once("value");
  const userData = snapshot.val();

  let finalMessage = "";
  if (data === "send_anonymous") {
    finalMessage = `📩 *Anonymous Message Received:*\n\n${session.message}`;
  } else if (data === "send_with_info") {
    finalMessage = `📩 *Message From ${userData.first_name || "Unknown"} ${
      userData.last_name || ""
    }*\n*Matric Number:* ${userData.matric_number || "Unknown"}\n\n${
      session.message
    }`;
  }

  // Replace with actual admin group/chat ID
  const ADMIN_CHAT_ID = "YOUR_ADMIN_CHAT_ID_HERE";

  await bot.sendMessage(ADMIN_CHAT_ID, finalMessage, {
    parse_mode: "Markdown",
  });

  await bot.sendMessage(chatId, "✅ Your message has been sent. Thank you!");

  delete contactSessions[userId];

  // Acknowledge the button press
  bot.answerCallbackQuery(query.id);
});

bot.onText(/\/contacts/, (msg) => {
  const contactInfo = `
📬 *Covenant University Contact Directory*


1️⃣ *Attendance Issues*
• Biometrics Office – Chapel, 2nd Floor  
• Dean, Student Affairs  
✉️ attendance-sa@covenantuniversity.edu.ng  
✉️ dsa@covenantuniversity.edu.ng

2️⃣ *Hall of Residence Issues*
• Residency Administrator – Lydia Hall, 1st Floor  
• Dean, Student Affairs  
✉️ residency-sa@covenantuniversity.edu.ng  
✉️ dsa@covenantuniversity.edu.ng

3️⃣ *Hall Facilities Issues*
• Facilities Officer – Lydia Hall, 2nd Floor

4️⃣ *Exeat Matters*
• Dean, Student Affairs – Lydia Hall, 2nd Floor  
✉️ dsa@covenantuniversity.edu.ng

5️⃣ *Financial Issues*
• School Fees, Refunds, Others  
✉️ dfs@covenantuniversity.edu.ng

6️⃣ *Medical / Special Care Needs*
• Head of Welfare & Quality Control  
• CUSC Welfare Officer – Chapel & Student Council Offices  
✉️ welfaresecf.cusc@covenantuniversity.edu.ng

7️⃣ *Food/Café Issues*
• Café Manager  
• Welfare Office  
• CUSC Welfare Officer  
✉️ welfaresecf.cusc@covenantuniversity.edu.ng

8️⃣ *Academic Progression / Performance*
✉️ academicaffairs@covenantuniversity.edu.ng

9️⃣ *Postgraduate Issues*
✉️ deansps@covenantuniversity.edu.ng

🔟 *Spiritual / Counseling Issues*
• Chaplain, Associate Chaplain  
• Student Chaplaincy Office  
✉️ cu.studentchaplaincy@gmail.com

1️⃣1️⃣ *Portal / Registration / Login Issues*
• CSIS Office – CMSS, 2nd Floor  
• ICT – Zenith Bank  
✉️ dcsis@covenantuniversity.edu.ng

1️⃣2️⃣ *Follow-Up on Issues*
• CUSC Chairman  
• Student Council Office  
✉️ chairman.cusc@covenantuniversity.edu.ng
`;

  bot.sendMessage(msg.chat.id, contactInfo, { parse_mode: "Markdown" });
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

//Done
bot.onText(/\/view_events/, async (msg) => {
  const chatId = msg.chat.id;
  const db = admin.database();

  try {
    const snapshot = await db.ref("events").once("value");
    const events = snapshot.val();

    if (!events) {
      return bot.sendMessage(chatId, "📭 No events available at the moment.");
    }

    let message = "📅 *Upcoming Events:*\n\n";
    Object.values(events).forEach((event, index) => {
      message += `*${index + 1}. ${event.title}*\n📖 ${
        event.description
      }\n🗓 Date: ${event.date}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error fetching events:", error);
    bot.sendMessage(chatId, "❌ Couldn't load events. Please try again.");
  }
});

bot.onText(/\/events/, (msg) => {
  const chatId = msg.chat.id;
  const db = admin.database();

  try {
    const snapshot = await db.ref("events").once("value");
    const events = snapshot.val();

    if (!events) {
      return bot.sendMessage(chatId, "📭 No events available at the moment.");
    }

    let message = "📅 *Upcoming Events:*\n\n";
    Object.values(events).forEach((event, index) => {
      message += `*${index + 1}. ${event.title}*\n📖 ${
        event.description
      }\n🗓 Date: ${event.date}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error fetching events:", error);
    bot.sendMessage(chatId, "❌ Couldn't load events. Please try again.");
  }
});

bot.onText(/\/announcements/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const db = admin.database();
    const snapshot = await db.ref('announcements').orderByChild('timestamp').limitToLast(10).once('value');
    const announcements = snapshot.val();

    if (announcements) {
      let announcementsText = "📢 *Latest Announcements:*\n\n";
      Object.keys(announcements).reverse().forEach(key => {
        const announcement = announcements[key];
        announcementsText += `📅 ${announcement.date || "No Date"}\n`;
        announcementsText += `${announcement.message || "No message"}\n\n`;
      });

      bot.sendMessage(chatId, announcementsText, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, "⚠️ No announcements found.");
    }
  } catch (error) {
    console.error("Error fetching announcements:", error);
    bot.sendMessage(chatId, "❌ Could not retrieve the announcements. Please try again later.");
  }
});


//Admin Commands
//Done
bot.onText(/\/admin/, (msg) => {
  bot.sendMessage(msg.chat.id, adminMessage, { parse_mode: "Markdown" });
});

bot.onText(/\/add_admin (\S+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const matricNumber = match[1]; // Extract matric number from the command

  // Only allow admins to execute this command
  const userId = msg.from.id.toString();
  const db = admin.database();
  const adminSnapshot = await db.ref("admins").child(userId).once("value");

  if (!adminSnapshot.exists()) {
    return bot.sendMessage(chatId, "⚠️ You are not authorized to add admins.");
  }

  // Call the function to add the admin by matric number
  const addedUser = await addAdminByMatricNumber(matricNumber);

  if (addedUser) {
    bot.sendMessage(chatId, `✅ Admin added successfully:\n\nName: ${addedUser.first_name} ${addedUser.last_name}\nMatric Number: ${addedUser.matric_number}`);
  } else {
    bot.sendMessage(chatId, "⚠️ No user found with this matric number.");
  }
});


const adminStates = {}; // Track admin input state
//Done
bot.onText(/\/send_announcement/, (msg) => {
  const chatId = msg.chat.id;

  // Ask for the announcement content
  bot.sendMessage(
    chatId,
    "📢 Please type the announcement message you'd like to send to all users:"
  );

  adminStates[chatId] = "awaiting_announcement";
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Only respond if the admin is expected to send an announcement
  if (adminStates[chatId] === "awaiting_announcement") {
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
      bot.sendMessage(
        chatId,
        "❌ There was an error sending the announcement."
      );
    }

    // Clear the state
    delete adminStates[chatId];
  }
});

bot.onText(/\/add_user/, (msg) => {
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

const addEventSessions = {};

bot.onText(/\/add_event/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  addEventSessions[userId] = { step: "awaiting_title" };
  bot.sendMessage(
    chatId,
    "🗓 *Add New Event*\n\nPlease enter the event title:",
    {
      parse_mode: "Markdown",
    }
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  const session = addEventSessions[userId];
  if (!session) return;

  if (session.step === "awaiting_title") {
    session.title = text;
    session.step = "awaiting_description";
    return bot.sendMessage(chatId, "✏️ Please enter the event description:");
  }

  if (session.step === "awaiting_description") {
    session.description = text;
    session.step = "awaiting_date";
    return bot.sendMessage(
      chatId,
      "📅 Please enter the event date (format: YYYY-MM-DD):"
    );
  }

  if (session.step === "awaiting_date") {
    session.date = text;

    // Save to Firebase
    const eventRef = admin.database().ref("events").push();
    await eventRef.set({
      title: session.title,
      description: session.description,
      date: session.date,
    });

    bot.sendMessage(chatId, "✅ Event has been added successfully!");

    delete addEventSessions[userId];
  }
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

// --- Express Server Setup ---
app.get("/", (req, res) => {
  res.send("Council bot is running!");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
