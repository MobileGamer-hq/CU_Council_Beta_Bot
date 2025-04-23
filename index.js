const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const path = require("path");
const fs = require("fs");
const moment = require("moment"); // To handle date comparison more easily
const csv = require("csv-parser");
const cron = require("node-cron");

const { commands, adminCommands } = require("./data/commands");
const admin = require("./utilities/firebase"); // Import the firebase admin SDK
const {
  getUserIds,
  addUser,
  getUser,
  addAdminByMatricNumber,
} = require("./utilities/database");
const faq = require("./data/faq");
const {
  midDayMessages,
  morningMessages,
  eveningMessages,
} = require("./data/messages");

const app = express();
app.use(express.json());

require("dotenv").config();

// --- Telegram Bot Setup ---
const token = process.env.BOT_TOKEN;
const port = process.env.PORT || 3000;
const url = "https://cu-council-beta-bot.onrender.com"; // or your ngrok HTTPS URL

// Create bot instance, don't start polling
const bot = new TelegramBot(token);

app.post(`/bot${token}`, (req, res) => {
  console.log("Received update:", req.body);
  try {
    bot.processUpdate(req.body);

    res.sendStatus(200); // Acknowledge the update
  } catch (err) {
    console.log(`Error: ${err}`);
    res.send(err);
  }
});

async function sendAndStoreMessage(chatId, text, options = {}) {
  try {
    const sentMessage = await bot.sendMessage(chatId, text, options);

    // Save to your database
    const db = admin.database();
    const key = `${chatId}_${sentMessage.message_id}`;
    await db.ref("botChats").child(key).set({
      chat_id: chatId,
      message_id: sentMessage.message_id,
      timestamp: Date.now()
    });

    return sentMessage;
  } catch (err) {
    console.error("Error sending or storing message:", err);
  }
}

bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  bot.sendMessage(chatId, resp);
});

//User Commands
//Done
const userStates = {}; // To keep track of user input progress
const userTempData = {}; // To temporarily store user data

//Done
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

//Done
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

//For SignUp (Start and Join)
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
         try{
          await sendAndStoreMessage(6311922657, `👤 New user Created, *${userData.first_name}*, ${userData.matric_number}`, {
            parse_mode: "Markdown",
          });
         }catch(err){
          console.log(err)
         }

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
          await bot.setMyCommands([...adminCommands, ...commands]);
          return bot.sendMessage(
            chatId,
            "🔐 Welcome Admin! You now have access to admin commands."
          );
        } else {
          await bot.setMyCommands(commands);
          return bot.sendMessage(
            chatId,
            "👋 Use /help to explore what I can do."
          );
        }
      } catch (err) {
        console.error("Failed to fetch admin list:", err);
        return bot.sendMessage(
          chatId,
          "⚠️ An error occurred while checking your role."
        );
      }

      break;
  }
});

//Done
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

//Done
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

//For Update Info
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  // Check if the message contains text
  if (!msg.text) {
    return; // If no text, don't proceed
  }

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
💡 /suggest – Share your suggestions or ideas  
❓ /faq – Get answers to common questions  
✉️ /contact – Send a message to the Student Council (you can stay anonymous)
📚 /help – Show this help message again

_Type a command to get started. We're here to help make your school experience better!_

— *Covenant University Student Council*
`;

  bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: "Markdown" });
});

const contactSessions = {}; // temp in-memory store for contact flow

//Done
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

  // Check if msg.text exists before using toLowerCase
  if (msg.text && msg.text.toLowerCase().startsWith("/contact")) return;

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

// Callback for contact
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

  // Fetch all admins from the database
  const adminSnapshot = await db.ref("admins").once("value");
  const adminList = adminSnapshot.val() || {}; // Get the list of admins

  // Iterate over all admins and send the message
  for (let adminId in adminList) {
    const adminChatId = adminId; // In Firebase, adminId is the chat ID

    // Send the message to the admin
    await bot.sendMessage(adminChatId, finalMessage, {
      parse_mode: "Markdown",
    });
  }

  // Inform the user that the message has been sent
  await bot.sendMessage(chatId, "✅ Your message has been sent. Thank you!");

  // Clear the session data
  delete contactSessions[userId];

  // Acknowledge the button press
  bot.answerCallbackQuery(query.id);
});

bot.onText(/\/faq/, async (msg) => {
  const chatId = msg.chat.id;
  const db = admin.database();

  try {
    const snapshot = await db.ref("faqs").once("value");
    const faqs = snapshot.val();

    if (!faqs) {
      return bot.sendMessage(chatId, "❓ No FAQs available at the moment.");
    }

    let faqMessage = "❓ *Frequently Asked Questions*\n\n";

    Object.values(faqs).forEach((item, index) => {
      faqMessage += `*Q${index + 1}:* ${item.question}\n`;
      faqMessage += `*A:* ${item.answer}\n\n`;
    });

    bot.sendMessage(chatId, faqMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    bot.sendMessage(chatId, "❌ Failed to load FAQs. Please try again later.");
  }
});

//Done
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

//Not Done
bot.onText(/\/suggest/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Covenant University Telegram Bot");
});

// Command to view lost and found items
bot.onText(/\/view_lost_and_found/, async (msg) => {
  const chatId = msg.chat.id;
  const db = admin.database();

  try {
    const snapshot = await db.ref("lost_and_found").once("value");
    const items = snapshot.val();

    if (!items) {
      return bot.sendMessage(
        chatId,
        "📭 No lost and found items available at the moment."
      );
    }

    let message = "🔍 *Lost and Found Items:*\n\n";
    let itemCount = 0;

    Object.values(items).forEach((item, index) => {
      itemCount++;
      message += `*Item ${itemCount}:*\n📸 Picture: [Click to View](https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${item.picture})\n📝 Description: ${item.description}\n\n`;
    });

    if (itemCount === 0) {
      message = "📭 No lost and found items available.";
    }

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error fetching lost and found items:", error);
    bot.sendMessage(
      chatId,
      "❌ Couldn't load lost and found items. Please try again."
    );
  }
});

// Command to view lost and found items
bot.onText(/\/lost_and_found/, async (msg) => {
  const chatId = msg.chat.id;
  const db = admin.database();

  try {
    const snapshot = await db.ref("lost_and_found").once("value");
    const items = snapshot.val();

    if (!items) {
      return bot.sendMessage(
        chatId,
        "📭 No lost and found items available at the moment."
      );
    }

    let message = "🔍 *Lost and Found Items:*\n\n";
    let itemCount = 0;

    Object.values(items).forEach((item, index) => {
      itemCount++;
      message += `*Item ${itemCount}:*\n📸 Picture: [Click to View](https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${item.picture})\n📝 Description: ${item.description}\n\n`;
    });

    if (itemCount === 0) {
      message = "📭 No lost and found items available.";
    }

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error fetching lost and found items:", error);
    bot.sendMessage(
      chatId,
      "❌ Couldn't load lost and found items. Please try again."
    );
  }
});

// Command to send lost or found items
bot.onText(/\/submit_lost_and_found/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Start a session for the user
  addEventSessions[userId] = addEventSessions[userId] || {};
  addEventSessions[userId].step = "awaiting_item_picture"; // Step 1: Wait for a picture

  bot.sendMessage(
    chatId,
    "📸 Please send a picture of the lost or found item."
  );
});

// Handle picture submission
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const photo = msg.photo[msg.photo.length - 1].file_id; // Get the largest size of the photo

  const session = addEventSessions[userId];
  if (!session || session.step !== "awaiting_item_picture") return;

  // Save the picture for the item
  session.itemPicture = photo;
  session.step = "awaiting_item_description"; // Move to the next step

  bot.sendMessage(chatId, "📝 Please provide a description of the item.");
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  const session = addEventSessions[userId];
  if (!session) return;

  if (session.step === "awaiting_item_description") {
    // Save the description of the item
    session.itemDescription = text;
    session.step = "completed"; // End the session

    // Save the item to Firebase
    const itemRef = admin.database().ref("lost_and_found").push();
    const newItem = {
      userId,
      picture: session.itemPicture,
      description: session.itemDescription,
      timestamp: Date.now(),
    };
    await itemRef.set(newItem);

    bot.sendMessage(chatId, "✅ Your lost/found item has been submitted!");

    // Fetch the list of admin users from Firebase
    const adminsRef = admin.database().ref("admins");
    const adminsSnapshot = await adminsRef.once("value");
    const admins = adminsSnapshot.val();

    if (admins) {
      // Send item details to each admin
      const itemMessage = `📢 *New Lost/Found Item Submitted:*\n\nDescription: ${
        newItem.description
      }\n\nItem Picture: ${
        newItem.picture ? newItem.picture : "No picture provided"
      }\n\nSubmitted by User ID: ${userId}`;

      Object.keys(admins).forEach((adminId) => {
        bot.sendMessage(adminId, itemMessage, { parse_mode: "Markdown" });
      });
    }

    // Reset session for the user
    delete addEventSessions[userId];
  }
});

const events = [];

// Load events data from CSV file
fs.createReadStream("./files/events.csv") // Path to your CSV file
  .pipe(csv())
  .on("data", (row) => {
    events.push(row);
  })
  .on("end", () => {
    console.log("CSV data loaded");
  });

function formatSingleEvent(event) {
  return `📌 *${event["Event Name"]}*\n\n*Date:* ${event["Date"]}\n*Time:* ${event["Time"]}\n*Venue:* ${event["Venue"]}\n*Type:* ${event["Event Type"]}`;
}

bot.onText(/\/semester_events/, async (msg) => {
  const chatId = msg.chat.id;

  if (events.length === 0) {
    bot.sendMessage(
      chatId,
      "⚠️ Events are still loading. Please try again in a few seconds."
    );
    return;
  }

  bot.sendMessage(chatId, "Here are the upcoming semester events:", {
    parse_mode: "Markdown",
  });

  for (const event of events) {
    const message = formatSingleEvent(event);
    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
});

// Function to filter events for the current month
function getMonthlyEvents(events) {
  const currentMonth = moment().format("MMMM"); // Current month in full format (e.g., 'April')

  return events.filter((event) => {
    const eventDate = moment(event["Date"], "Do MMMM, YYYY"); // Format the event's date
    return eventDate.format("MMMM") === currentMonth; // Compare the event's month with the current month
  });
}

// Function to format individual event details
function formatSingleEvent(event) {
  return `
    📅 *Event Name*: ${event["Event Name"]}
    🗓 *Date*: ${event["Date"]}
    🕑 *Time*: ${event["Time"] || "Not yet determined"}
    📍 *Venue*: ${event["Venue"]}
    🏷 *Event Type*: ${event["Event Type"]}
  `;
}

// Respond to /monthly_events command
bot.onText(/\/monthly_events/, async (msg) => {
  const chatId = msg.chat.id;

  if (events.length === 0) {
    bot.sendMessage(
      chatId,
      "⚠️ Events are still loading. Please try again in a few seconds."
    );
    return;
  }

  const monthlyEvents = getMonthlyEvents(events);

  if (monthlyEvents.length === 0) {
    bot.sendMessage(chatId, "⚠️ No events found for this month.");
    return;
  }

  bot.sendMessage(chatId, "Here are the upcoming events for this month:", {
    parse_mode: "Markdown",
  });

  // Send each event one by one
  for (const event of monthlyEvents) {
    const message = formatSingleEvent(event);
    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
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

    // Get current date and calculate the start and end of the week (Monday to Sunday)
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7)); // Sunday

    let message = "📅 *Upcoming Events This Week:*\n\n";
    let eventCount = 0;

    Object.values(events).forEach((event, index) => {
      const eventDate = new Date(event.date);

      // Check if the event is within the current week
      if (eventDate >= startOfWeek && eventDate <= endOfWeek) {
        eventCount++;
        message += `*${eventCount}. ${event.title}*\n📖 ${event.description}\n🗓 Date: ${event.date}\n\n`;
      }
    });

    if (eventCount === 0) {
      message = "📭 No events available for this week.";
    }

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error fetching events:", error);
    bot.sendMessage(chatId, "❌ Couldn't load events. Please try again.");
  }
});

bot.onText(/\/events/, async (msg) => {
  const chatId = msg.chat.id;
  const db = admin.database();

  try {
    const snapshot = await db.ref("events").once("value");
    const events = snapshot.val();

    if (!events) {
      return bot.sendMessage(chatId, "📭 No events available at the moment.");
    }

    // Get current date and calculate the start and end of the week (Monday to Sunday)
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7)); // Sunday

    let message = "📅 *Upcoming Events This Week:*\n\n";
    let eventCount = 0;

    Object.values(events).forEach((event, index) => {
      const eventDate = new Date(event.date);

      // Check if the event is within the current week
      if (eventDate >= startOfWeek && eventDate <= endOfWeek) {
        eventCount++;
        message += `*${eventCount}. ${event.title}*\n📖 ${event.description}\n🗓 Date: ${event.date}\n\n`;
      }
    });

    if (eventCount === 0) {
      message = "📭 No events available for this week.";
    }

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error fetching events:", error);
    bot.sendMessage(chatId, "❌ Couldn't load events. Please try again.");
  }
});

//Done
const userAnnouncementStates = {};

bot.onText(/\/announcements/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const db = admin.database();
    const snapshot = await db
      .ref("announcements")
      .orderByChild("timestamp")
      .limitToLast(10)
      .once("value");
    const announcements = snapshot.val();

    if (announcements) {
      let announcementsText = "📢 *Latest Announcements:*\n\n";
      Object.keys(announcements)
        .reverse()
        .forEach((key) => {
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
    bot.sendMessage(
      chatId,
      "❌ Could not retrieve the announcements. Please try again later."
    );
  }
});

bot.onText(/\/more/, async (msg) => {
  const chatId = msg.chat.id;
  const state = userAnnouncementStates[chatId];

  if (!state || !state.lastTimestamp) {
    return bot.sendMessage(chatId, "❗ Please use /announcements first.");
  }

  try {
    const db = admin.database();
    const ref = db.ref("announcements");

    const snapshot = await ref
      .orderByChild("timestamp")
      .endAt(state.lastTimestamp - 1)
      .limitToLast(10)
      .once("value");

    const announcements = snapshot.val();

    if (announcements) {
      const announcementArray = Object.values(announcements).sort(
        (a, b) => b.timestamp - a.timestamp
      );

      let text = "*More Announcements:*\n\n";
      announcementArray.forEach((a) => {
        text += `📅 ${new Date(a.timestamp).toLocaleString()}\n`;
        text += `${a.message}\n\n`;
      });

      // Update state
      state.lastTimestamp =
        announcementArray[announcementArray.length - 1].timestamp;
      userAnnouncementStates[chatId] = state;

      bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, "✅ You've reached the end of announcements.");
    }
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Could not load more announcements.");
  }
});

//Admin Commands
//Done
bot.onText(/\/admin_help/, (msg) => {
  const adminMessage = `
*🔧 Admin Commands:*

👤 *User Management*
/users – View total user count
/add_user – Add a new user to the system  
/remove_user – Remove a user from the system  
/view_users – View all registered users  

📢 *Messaging*
/send_message – Send a message to all users  
/send_announcement – Broadcast an announcement  

🗳️ *Polls & Feedback*
/add_poll – Create a new poll  
/close_poll – Close an active poll  
/view_polls – View ongoing polls  
/view_feedback – View feedback from users  
/view_suggestions – View suggestions from users  

📅 *Events & Scheduling*
/add_event – Add a new event to the calendar  
/view_events – View all scheduled events  
/upload_timetable – Upload the class timetable  

📂 *Data Management*
/upload – Upload a file or document  
/add – Add general data  
/update – Update general data  
/update_contact – Update a contact  
/update_contacts – Update multiple contacts  
`;
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
    // Notify the current admin
    bot.sendMessage(
      chatId,
      `✅ Admin added successfully:\n\nName: ${addedUser.first_name} ${addedUser.last_name}\nMatric Number: ${addedUser.matric_number}`
    );

    // Notify the newly added admin
    const newAdminChatId = addedUser.chatId; // Assuming chatId is stored for the user
    bot.sendMessage(
      newAdminChatId,
      `🎉 Congratulations! You are now an admin. You can now use admin commands to manage the bot.`
    );

    // Update the new admin's commands
    const newAdminCommands = [
      ...adminCommands, // Existing admin commands
      ...commands // Additional commands specific to new admins if any
    ];

    await bot.setMyCommands(newAdminCommands);

  } else {
    bot.sendMessage(chatId, "⚠️ No user found with this matric number.");
  }
});


const adminStates = {}; // keep track of admins adding FAQs

bot.onText(/\/add_faq/, (msg) => {
  const chatId = msg.chat.id;

  // TODO: Optionally verify admin identity here

  adminStates[chatId] = { step: "awaiting_question" };

  bot.sendMessage(chatId, "📝 Please send the FAQ *question*.");
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Skip if this message is a command
  if (msg.text.startsWith("/")) return;

  const state = adminStates[chatId];

  if (!state) return;

  if (state.step === "awaiting_question") {
    state.question = msg.text;
    state.step = "awaiting_answer";
    bot.sendMessage(chatId, "✅ Got it. Now send the *answer*.");
  } else if (state.step === "awaiting_answer") {
    const db = admin.database();
    const faqRef = db.ref("faqs").push();

    try {
      await faqRef.set({
        question: state.question,
        answer: msg.text,
        timestamp: Date.now(),
      });

      bot.sendMessage(chatId, "✅ FAQ added successfully.");
    } catch (error) {
      console.error("Error saving FAQ:", error);
      bot.sendMessage(chatId, "❌ Failed to save FAQ. Please try again.");
    }

    delete adminStates[chatId];
  }
});

//Done

// Command to start announcement
bot.onText(/\/send_announcement/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "📢 Please type the announcement message you'd like to send to all users:"
  );

  adminStates[chatId] = "awaiting_announcement";
});

// Handle the actual announcement message
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Avoid processing the command itself again
  if (text.toLowerCase().startsWith("/send_announcement")) return;

  if (adminStates[chatId] === "awaiting_announcement") {
    const db = admin.database();
    const announcementsRef = db.ref("announcements");

    const newAnnouncement = {
      message: text,
      timestamp: Date.now(),
      from: msg.from.username || msg.from.first_name || "Admin",
    };

    try {
      // Save the announcement to Firebase
      await announcementsRef.push(newAnnouncement);

      // Send a success message to the admin
      bot.sendMessage(chatId, "✅ Announcement saved successfully.");

      // Retrieve users from Firebase and send the announcement
      const usersRef = db.ref("users");
      const usersSnapshot = await usersRef.once("value");
      const users = usersSnapshot.val();

      if (users) {
        // Send the announcement to all users
        Object.keys(users).forEach((userId) => {
          const userChatId = users[userId].chatId; // Assuming the user object has a `chatId` property
          bot.sendMessage(
            userChatId,
            `📢 *Announcement from ${newAnnouncement.from}:*\n\n${newAnnouncement.message}`,
            { parse_mode: "Markdown" }
          );
        });
      }
    } catch (error) {
      console.error("❌ Error saving announcement:", error);
      bot.sendMessage(chatId, "❌ Failed to save announcement.");
    }

    // Clear the admin's state
    delete adminStates[chatId];
  }
});

//For the send announcement command
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

//Not Done
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

bot.onText(/\/view_users/, async (msg) => {
  const chatId = msg.chat.id;

  // Get the list of users from Firebase
  const usersRef = admin.database().ref("users");
  const usersSnapshot = await usersRef.once("value");
  const users = usersSnapshot.val();

  if (!users) {
    bot.sendMessage(chatId, "No users found in the database.");
    return;
  }

  let userListMessage = "👥 *List of Users:*\n\n";
  Object.keys(users).forEach((userId) => {
    const user = users[userId];
    const userInfo = `
      🆔 *ID:* ${userId}
      👤 *Name:* ${user.first_name} ${user.last_name}
      🏫 *Matric Number:* ${user.matric_number}
      🎓 *Level:* ${user.level}
      🗓 *Joined At:* ${new Date(user.joinedAt).toLocaleString()}
      🖥 *Username:* ${user.username || "N/A"}
      🤖 *Is Bot:* ${user.is_bot ? "Yes" : "No"}
    `;
    userListMessage += `${userInfo}\n\n`;
  });

  // Send the list of users to the admin
  bot.sendMessage(chatId, userListMessage, { parse_mode: "Markdown" });
});

const addEventSessions = {};

//Done
// Start the add_event flow
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

//Done
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
    // Check if the date is in the correct format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(text)) {
      return bot.sendMessage(
        chatId,
        "❌ The date format is invalid. Please use YYYY-MM-DD format (e.g., 2025-04-22)."
      );
    }

    // Check if the date is valid
    const eventDate = new Date(text);
    if (eventDate.toString() === "Invalid Date") {
      return bot.sendMessage(
        chatId,
        "❌ The date you entered is not a valid date. Please enter a valid date (format: YYYY-MM-DD)."
      );
    }

    session.date = text;

    // Save event to Firebase
    const eventRef = admin.database().ref("events").push();
    const newEvent = {
      title: session.title,
      description: session.description,
      date: session.date,
      timestamp: Date.now(),
    };
    await eventRef.set(newEvent);

    bot.sendMessage(chatId, "✅ Event has been added successfully!");

    // Broadcast event to all users
    const usersRef = admin.database().ref("users");
    const usersSnapshot = await usersRef.once("value");
    const users = usersSnapshot.val();

    if (users) {
      const eventMessage = `📢 *New Event Added!*\n\n🗓 *${newEvent.title}*\n📅 ${newEvent.date}\n\n${newEvent.description}`;
      Object.keys(users).forEach((userId) => {
        bot.sendMessage(userId, eventMessage, { parse_mode: "Markdown" });
      });
    }

    delete addEventSessions[userId];
  }
});

//Not Done
bot.onText(/\/update_contacts/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to Covenant University Telegram Bot");
});

//Done
bot.onText(/\/create_poll/, async (msg) => {
  const chatId = msg.chat.id;

  // Send the initial prompt to the admin who issued the command
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

  // Fetch all users from the database
  const db = admin.database();
  const snapshot = await db.ref("users").once("value");
  const users = snapshot.val() || {}; // Get all users

  // Iterate over each user and send them a message about the poll
  for (let userId in users) {
    const userChatId = users[userId].chat_id; // Assuming user has chat_id stored in the database

    // Send the poll to the user
    await bot.sendMessage(
      userChatId,
      "A new poll is being created. Stay tuned for more details!"
    );
  }

  // Optionally, send a confirmation to the admin about the broadcast
  bot.sendMessage(
    chatId,
    "✅ The poll announcement has been sent to all users."
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const text = msg.text;

  // Skip if it's a command
  if (!text || text.startsWith("/")) return;

  // Set timeout to delete message after 5 minutes (300,000 ms)
  setTimeout(() => {
    bot.deleteMessage(chatId, messageId).catch((err) => {
      console.error("❌ Error deleting message:", err.message);
    });
  }, 300000); // 5 minutes in milliseconds
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

// Function to send random message to a user
function sendRandomMessage(chatId, messageList) {
  const randomIndex = Math.floor(Math.random() * messageList.length);
  const message = messageList[randomIndex];
  bot.sendMessage(chatId, message);
}

// Fetch users from Firebase
async function getUsersFromFirebase() {
  const usersRef = admin.database().ref("users");
  const usersSnapshot = await usersRef.once("value");
  return usersSnapshot.val(); // Return users object
}

// Send random morning message at 8 AM
cron.schedule("0 7 * * *", async () => {
  console.log("Sending morning messages to all users...");
  const users = await getUsersFromFirebase();
  if (users) {
    Object.keys(users).forEach((userId) => {
      sendRandomMessage(userId, morningMessages);
    });
  }
});

// Send random midday message at 12 PM
cron.schedule("0 11 * * *", async () => {
  console.log("Sending midday messages to all users...");
  const users = await getUsersFromFirebase();
  if (users) {
    Object.keys(users).forEach((userId) => {
      sendRandomMessage(userId, midDayMessages);
    });
  }
});

// Send random evening message at 8 PM
cron.schedule("0 19 * * *", async () => {
  console.log("Sending evening messages to all users...");
  const users = await getUsersFromFirebase();
  if (users) {
    Object.keys(users).forEach((userId) => {
      sendRandomMessage(userId, eveningMessages);
    });
  }
});


cron.schedule("0 23 * * *", async () => {
  console.log("Running scheduled cleanup...");

  const snapshot = await ref.once("value");
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  snapshot.forEach(async (child) => {
    const data = child.val();
    if (now - data.timestamp > oneDay) {
      try {
        await bot.deleteMessage(data.chat_id, data.message_id);
        await ref.child(child.key).remove();
        console.log(`Deleted message ${data.message_id} from chat ${data.chat_id}`);
      } catch (err) {
        console.error("Failed to delete message:", err);
      }
    }
  });
});

// --- Express Server Setup ---
app.get("/", (req, res) => {
  // Set the webhook
  bot.setWebHook(`${url}/bot${token}`);
  res.send("Council bot is running!");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
