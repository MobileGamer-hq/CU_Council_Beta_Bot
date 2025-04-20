const adminMessage = `
*Admin Commands:*
/users
/add_user – Add a new user to the system  
/remove_user – Remove a user from the system  
/view_users – View all registered users  

/send_message – Send a message to all users  
/send_announcement – Send a message to all users  
/view_feedback – View feedback from users  
/view_suggestions – View suggestions from users  
/view_polls – View ongoing polls

/upload  
/upload_timetable

/add
/add_event
/add_poll

/update
/update_contact
/update_contacts

/
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
