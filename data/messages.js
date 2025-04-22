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

const helpMessage = `
👋 *Welcome to the Covenant University Student Council Bot!*

Here are the commands you can use:

📢 /announcements – View the latest updates from the Student Council  
📅 /events – See upcoming school events and activities  
🗳 /poll – Participate in ongoing polls or vote on issues  
💡 /suggest – Share your suggestions or ideas  
❓ /faq – Get answers to common questions  
✉️ /contact – Contact the Student Council (you can stay anonymous) 
/contacts – Sends a list of email contacts
🎉 /fun – Get daily quotes, fun facts, or trivia  
📚 /help – Show this help message again

— *Covenant University Student Council*
  `;


  const morningMessages = [
    "Good morning! 🌞 Let's make today great. You got this! 💪",
    "Rise and shine! 🌅 A new day means new opportunities. Go out there and seize them! 🚀",
    "Good morning, scholar! 📚 Remember, every day is a chance to learn something new. Make the most of it!",
    "Hey there! 🌟 Start your day with a positive mindset and great things will follow. Have an awesome day! 😁",
    "Good morning! ☕️ Ready to take on the world today? The first step is always the hardest, but you can do it! 💯",
    "Rise and grind! 🌞 A day full of possibilities awaits you. Don't forget to smile along the way! 😊",
    "Morning, champ! 🏅 Today is the perfect day to achieve something amazing. Keep pushing forward!",
    "Good morning! ✨ Remember, success is the sum of small efforts repeated day in and day out. Keep going!",
    "Start your day with a smile 😊 and the world will smile with you! Have a productive day ahead!",
    "Good morning! 🌄 Every day is a new opportunity to improve. Let's make today count! 📈",
    "Good morning, future leader! 👑 Set your goals high and don't stop until you get there. Today is a great day to start!",
    "Good morning, superstar! 🌟 Remember that your dreams are valid and your hard work will get you there. Have an amazing day! 💪",
    "Rise and shine! 🌞 A new day brings new chances to grow. Make today your masterpiece! 🎨",
    "Good morning! 🌻 A new day is like a blank page. Fill it with knowledge, positivity, and success!",
    "Good morning, student! 🎓 The world is full of endless possibilities. Take today one step at a time and enjoy the journey! 🌍",
    "Good morning! 🌞 Today is the perfect day to learn something new and be one step closer to your goals. Let's go! 🚀",
    "Good morning! 🌅 Your future is created by what you do today, not tomorrow. Make today count! ⏳",
    "Wake up and make it happen! 💥 Good morning, and remember that every small step takes you closer to your dreams.",
    "Morning! 🕊️ A good day starts with a positive mindset. Let’s make today amazing, one step at a time! 👣",
    "Good morning! 🌞 Embrace the challenges of today and know that you're capable of overcoming anything. You've got this! 💪"
  ];

  const midDayMessages = [
    "Hey there! 🌞 It's midday, which means you’ve already made great progress today. Keep up the awesome work! 💪",
    "Good afternoon! 🌻 You’re halfway through the day, and you're doing amazing! Stay focused and finish strong! 🌟",
    "It’s midday! 🌞 You’ve already accomplished so much today. Take a deep breath, stay positive, and keep going! 🌈",
    "Hey! 🌅 You’re halfway through the day—take a moment to celebrate your wins so far. The best is yet to come! ✨",
    "Good afternoon! 🕛 You're doing great so far! Keep up the momentum, and let's make the rest of the day count! 💯",
    "It’s midday! 🌞 Don’t forget to pause, stretch, and recharge for the second half of your day. You’ve got this! 💪",
    "Hey there! 🌼 Take a moment to reflect on all you’ve achieved today. The second half is just as important! Stay strong! 💪",
    "Good afternoon! 🌟 You’re halfway to your goals. Don’t stop now—keep pushing forward, and finish the day even stronger! 💼",
    "It’s a great day to be productive! 🌞 Keep that energy high, stay focused, and you'll crush the rest of your tasks! 🚀",
    "Good afternoon! 🌻 You've got this! Take a moment to recharge and then power through to finish your day on top! 🌟",
    "It’s midday! 🌞 Every little effort counts. Keep pushing, and you'll see how far you've come by the end of the day! 💡",
    "Hey there! 🌸 The day is halfway through, and you’ve done well so far. Keep up the focus and finish strong! 💪",
    "Good afternoon! 🌞 You’re doing great—don’t forget to drink some water and take a break before finishing strong! 💧",
    "It’s midday! 🌟 Remember to breathe, relax for a bit, and then continue working hard—you’re closer to your goals! 🌱",
    "Hey! 🌼 You’re halfway through your day—keep that momentum going, and make the most out of the rest of your day! 💥",
    "Good afternoon! 🌞 Reflect on how much you’ve achieved so far, and use that energy to keep crushing your goals! 💪",
    "It’s midday! 🌈 The day’s not over yet—let's finish it as strong as we started! Stay focused and keep going! 🚀",
    "Good afternoon! 🌸 Don’t forget to give yourself credit for how much you’ve done today—you're making great strides! 💯",
    "It’s a beautiful midday! 🌞 Keep your focus sharp and energy high—you're doing amazing things today! 🌟",
    "Hey! 🌻 You’re on the right track! Let’s keep this momentum and finish the day stronger than ever! 💥",
    "Good afternoon! 🌞 You've done some great work already. Stay motivated, and let's crush the rest of your tasks! 💪"
  ];
  


  const eveningMessages = [
    "Good evening! 🌙 It's time to reflect on your day and appreciate your progress. You’ve done great! ✨",
    "Evening! 🌆 Take a moment to relax, unwind, and recharge for tomorrow. You deserve it! 🌻",
    "Good evening! 🌙 Remember, rest is just as important as hard work. Recharge tonight to conquer tomorrow! 💫",
    "Evening, champ! 🏅 You've worked hard today, now take time to relax and get ready to take on tomorrow. 🌟",
    "Good evening! 🌜 No matter what the day threw at you, you made it through. Rest well, tomorrow is another chance! 💪",
    "Good evening! 🌙 Reflect on today’s wins, big or small, and rest knowing you gave your best. 💯",
    "Evening! 🌠 The day is done, and you’ve done your best. Now it’s time to rest and dream big for tomorrow! 🌙",
    "Good evening! 🌚 It’s the perfect time to wind down and show yourself some self-care. You’ve earned it! 🌿",
    "Evening! 🌜 As you relax tonight, remember that every effort counts. Rest up for the amazing day ahead! 💫",
    "Good evening! 🌙 You’ve made it through the day—now take a moment to appreciate yourself. Tomorrow’s another opportunity! 💪",
    "Evening! 🌙 It’s time to rest and recharge for the next adventure. Take care of yourself tonight! 🌱",
    "Good evening! 🌛 Today may have been challenging, but you’ve made progress. Rest up for the journey ahead! 💫",
    "Good evening, scholar! 🌙 Reflect on the knowledge gained today, and relax as you prepare for tomorrow’s challenges. 📚",
    "Evening! 🌠 It’s the perfect time to slow down and appreciate everything you’ve accomplished today. You’re doing great! 🌟",
    "Good evening! 🌙 Remember, success is built on consistent efforts. Take tonight to relax and get ready for tomorrow’s growth! 💼",
    "Good evening! 🌜 Rest is important too, so take time tonight to recharge and get ready to shine even brighter tomorrow! 🌞",
    "Evening, superstar! 🌟 Reflect on how far you’ve come, and know that tomorrow is another chance to keep growing! 🌙",
    "Good evening! 🌑 Take this time to relax and reflect. You’ve earned it after today’s hard work! 💪",
    "Evening! 🌙 Take a deep breath, rest, and get ready for another productive day tomorrow. You’re on the right path! 💼",
    "Good evening! 🌙 Take time tonight to reflect on your progress and relax. You’re closer to your goals every day! 🌟"
  ];

  


module.exports = {
  adminMessage,
  helpMessage,
  morningMessages,
  midDayMessages,
  eveningMessages,
};
