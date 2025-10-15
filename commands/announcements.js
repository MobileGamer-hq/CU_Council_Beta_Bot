module.exports = (bot) => {
  //Done
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
};
