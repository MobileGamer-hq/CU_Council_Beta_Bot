const admin = require("./firebase"); // Import the firebase admin SDK

// Function to get all user IDs
const getUserIds = async () => {
  try {
    const db = admin.database(); // Get a reference to the Realtime Database
    const snapshot = await db.ref("users").once("value"); // Fetch data from the 'users' node

    const users = snapshot.val(); // Get all users
    if (users) {
      const userIds = Object.keys(users); // Extract user IDs
      return userIds;
    } else {
      console.log("No users found.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching user IDs:", error);
    return [];
  }
};

const addUser = async (userId, userInfo = {}) => {
    try {
      const db = admin.database();
      const ref = db.ref(`users/${userId}`);
      await ref.set({
        ...userInfo,
        joinedAt: new Date().toISOString()
      });
  
      return true;
    } catch (error) {
      console.error(`Error adding user ${userId}:`, error);
      return false;
    }
  };

const addMultipleUsers = async (users = []) => {
  const results = [];

  for (const user of users) {
    const { id, ...info } = user;
    const success = await addUser(id, info);
    results.push({ id, success });
  }

  return results;
};

module.exports = {
  getUserIds, // Export the function to get user IDs
  addUser, // Export the function to add a user
  addMultipleUsers, // Export the function to add multiple users
};
