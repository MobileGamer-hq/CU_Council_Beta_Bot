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

module.exports = {
  adminMessage,
  helpMessage,
};
