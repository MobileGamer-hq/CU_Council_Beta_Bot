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

async function getUser(userId) {
  const db = admin.database();
  const snapshot = await db.ref(`users/${userId}`).once('value');
  return snapshot.val();
}


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

async function isUserAdmin(userId) {
  const snapshot = await admin.database().ref("admins").once("value");
  const adminList = snapshot.val() || {};
  return !!adminList[userId];
}

async function getUserByMatricNumber(matricNumber) {
  try {
    const db = admin.database();
    const snapshot = await db.ref("users").orderByChild("matric_number").equalTo(matricNumber).once("value");

    if (snapshot.exists()) {
      const userData = snapshot.val();
      return userData;
    } else {
      return null; // User not found
    }
  } catch (error) {
    console.error("Error fetching user by matric number:", error);
    return null;
  }
}

async function addAdminByMatricNumber(matricNumber) {
  try {
    const db = admin.database();

    // Query the user based on matric number
    const snapshot = await db.ref("users").orderByChild("matric_number").equalTo(matricNumber).once("value");

    if (snapshot.exists()) {
      // If user exists, get user data and their ID
      const userData = snapshot.val();
      const userId = Object.keys(userData)[0]; // Firebase returns data as an object with user IDs as keys

      // Add the user ID to the admin list in the database
      await db.ref("admins").child(userId).set(true);  // Set user as admin by adding their ID to the 'admins' node

      return userData[userId]; // Return the added user data
    } else {
      return null; // User not found
    }
  } catch (error) {
    console.error("Error adding admin:", error);
    return null;
  }
}


module.exports = {
  getUserIds, // Export the function to get user IDs
  getUser, // Export the function to get a user by ID
  addUser, // Export the function to add a user
  addMultipleUsers, // Export the function to add multiple users
  isUserAdmin, // Export the function to check if a user is an admin
  getUserByMatricNumber, // Export the function to get a user by matric number
  addAdminByMatricNumber // Export the function to add an admin by matric number
};
