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
