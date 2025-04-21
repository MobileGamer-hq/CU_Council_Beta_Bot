const commands = [
  { command: "/start", description: "Register or initialize your session" },
  { command: "/help", description: "View available commands and features" },
  { command: "/view_info", description: "Check your registered information" },
  { command: "/update_info", description: "Update your profile information" },
  { command: "/contact", description: "Send a message to school council" },
  { command: "/contacts", description: "Get contact details for school offices" },
  { command: "/view_events", description: "See upcoming CU events" },
  { command: "/announcements", description: "View latest announcements" },
  { command: "/timetable", description: "View latest announcements" },
  { command: "/view_events", description: "View latest announcements" },
  { command: "/suggest", description: "View latest announcements" },
];

const adminCommands = [
  { command: "/users", description: "View total number of users" },
  { command: "/add_user", description: "Add a new user to the system" },
  { command: "/remove_user", description: "Remove a user from the system" },
  { command: "/view_users", description: "View all registered users" },

  { command: "/send_message", description: "Send a message to all users" },
  { command: "/send_announcement", description: "Broadcast an announcement" },

  { command: "/add_poll", description: "Create a new poll" },
  { command: "/close_poll", description: "Close an active poll" },
  { command: "/view_polls", description: "View ongoing polls" },
  { command: "/view_feedback", description: "See feedback from users" },
  { command: "/view_suggestions", description: "View user suggestions" },

  { command: "/add_event", description: "Add a new event to the calendar" },
  { command: "/view_events", description: "List all upcoming events" },
  { command: "/upload_timetable", description: "Upload class timetable" },

  { command: "/upload", description: "Upload a document or resource" },
  { command: "/add", description: "Add general data" },
  { command: "/update", description: "Update general data" },
  { command: "/update_contact", description: "Update a single contact" },
  { command: "/update_contacts", description: "Update all contacts" },
];


module.exports = {
  commands,
  adminCommands,
};
