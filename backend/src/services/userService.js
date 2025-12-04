import User from "../models/User.js";

class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId).select("-password");
    return user;
  }

  async getOnlineUsers() {
    const users = await User.find({ isOnline: true })
      .select("username isOnline lastSeen")
      .sort({ lastSeen: -1 });
    return users;
  }

  async getAllUsers() {
    const users = await User.find()
      .select("username isOnline lastSeen")
      .sort({ username: 1 });
    return users;
  }

  async updateOnlineStatus(userId, isOnline) {
    const user = await User.findByIdAndUpdate(
      userId,
      { isOnline, lastSeen: Date.now() },
      { new: true }
    ).select("-password");
    return user;
  }
}

export default new UserService();
