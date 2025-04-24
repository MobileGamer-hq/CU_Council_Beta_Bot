const commands = [
  { command: "/start", description: "Register or initialize your session" },
  { command: "/help", description: "View available commands and features" },
  { command: "/view_info", description: "Check your registered information" },
  { command: "/update_info", description: "Update your profile information" },
  { command: "/contact", description: "Send a message to the Student Council (you can stay anonymous)" },
  { command: "/contacts", description: "Get contact details for school offices" },
  { command: "/events", description: "See upcoming CU events" },
  { command: "/announcements", description: "View the latest updates from the Student Council" },
  { command: "/timetable", description: "View your timetable for the semester" },
  { command: "/suggest", description: "Send a suggestion or idea to the council" },
  { command: "/faq", description: "Get answers to common questions" },
  // { command: "/poll", description: "Participate in ongoing polls or vote on issues" },
  // { command: "/fun", description: "Get daily quotes, fun facts, or trivia" },
  { command: "/submit_lost_and_found", description: "Submit a lost or found item (send a picture and description)" },
  { command: "/lost_and_found", description: "View lost and found items with pictures and descriptions" },
  { command: "/semester_events", description: "View events for the current semester" },
  {command: '/monthly_events', description: 'View events for the current month'},

];



const adminCommands = [
  { command: "/users", description: "View total number of users" },
  // { command: "/add_user", description: "Add a new user to the system" },
  { command: "/view_users", description: "View all registered users" },
  {command: "/find", description: "Find a user by their Matric number"},

  { command: "/send_message", description: "Send a message to all users" },
  { command: "/send_announcement", description: "Broadcast an announcement" },

  // { command: "/add_poll", description: "Create a new poll" },
  // { command: "/close_poll", description: "Close an active poll" },
  // { command: "/view_polls", description: "View ongoing polls" },
  // { command: "/view_feedback", description: "See feedback from users" },
  // { command: "/view_suggestions", description: "View user suggestions" },

  { command: "/add_event", description: "Add a new event to the calendar" },
  { command: "/view_events", description: "List all upcoming events" },
  { command: "/upload_timetable", description: "Upload class timetable" },

  { command: "/upload", description: "Upload a document or resource" },
  { command: "/add", description: "Add general data" },
  { command: "/update", description: "Update general data" },
  { command: "/update_contact", description: "Update a single contact" },
  { command: "/update_contacts", description: "Update all contacts" },

  {command: "/add_faq", description: "Add a new FAQ entry"},
];


module.exports = {
  commands,
  adminCommands,
};
