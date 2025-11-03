import User from "../models/User.js";

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user: User.sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    // Implementation
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const stats = await User.getUserStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const users = await User.searchUsers(req.query);
    res.json({ success: true, users: users.map(user => User.sanitizeUser(user)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};