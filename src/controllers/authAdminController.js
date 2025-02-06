import Chat from "../models/chatModel.js";
import ChatbotModel from "../models/userModel.js";

// Controller to fetch all users (based on username)
export const getAllUsers = async (req, res) => {
  try {
    const users = await ChatbotModel.find({ role: "user" }); // Fetch users only
    return res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      users
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching users."
    });
  }
};

// Controller to fetch a specific user by username
export const getUserById = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await ChatbotModel.findOne({ username, role: "user" });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }
    return res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      user
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user."
    });
  }
};

// Controller to fetch all chatbots (based on userid)
export const getAllChatbots = async (req, res) => {
  try {
    const chatbots = await ChatbotModel.find({ role: "user" }); // Fetch chatbots associated with users
    return res.status(200).json({
      success: true,
      message: "Chatbots fetched successfully.",
      chatbots
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching chatbots."
    });
  }
};

// Controller to fetch a specific chatbot by userid
export const getChatbotById = async (req, res) => {
  const { userid } = req.params;
  try {
    const chatbot = await ChatbotModel.findOne({ userid, role: "user" });
    if (!chatbot) {
      return res.status(404).json({
        success: false,
        message: "Chatbot not found."
      });
    }
    return res.status(200).json({
      success: true,
      message: "Chatbot fetched successfully.",
      chatbot
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching chatbot."
    });
  }
};

// Controller to delete a user
export const deleteUser = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await ChatbotModel.findOneAndDelete({ username, role: "user" });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }
    return res.status(200).json({
      success: true,
      message: "User deleted successfully."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error deleting user."
    });
  }
};

// Controller to delete a chatbot
export const deleteChatbot = async (req, res) => {
  const { userid } = req.params;
  try {
    const chatbot = await ChatbotModel.findOneAndDelete({ userid, role: "user" });
    if (!chatbot) {
      return res.status(404).json({
        success: false,
        message: "Chatbot not found."
      });
    }
    return res.status(200).json({
      success: true,
      message: "Chatbot deleted successfully."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error deleting chatbot."
    });
  }
};

// Controller to update user role (admin or user)
export const updateUser = async (req, res) => {
  const { username } = req.params;
  const { role } = req.body;  // Assume role is passed in the request body

  if (!role || !["user", "admin"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role."
    });
  }

  try {
    const user = await ChatbotModel.findOneAndUpdate(
      { username, role: "user" },
      { role },
      { new: true }  // Return updated user
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }
    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error updating user."
    });
  }
};

// Controller to update chatbot details
export const updateChatbot = async (req, res) => {
  const { userid } = req.params;
  const { username, password } = req.body;  // Example: username or password for update

  try {
    const chatbot = await ChatbotModel.findOneAndUpdate(
      { userid, role: "user" },
      { username, password },  // Update fields
      { new: true }
    );
    if (!chatbot) {
      return res.status(404).json({
        success: false,
        message: "Chatbot not found."
      });
    }
    return res.status(200).json({
      success: true,
      message: "Chatbot updated successfully.",
      chatbot
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error updating chatbot."
    });
  }
};



export const getStats = async (req, res) => {
  try {
    // Calculate total messages (total number of chat entries)
    const totalMessages = await Chat.aggregate([
      {
        $project: {
          totalMessages: {
            $add: [
              { $cond: { if: { $ne: ["$user_message", null] }, then: 1, else: 0 } },
              { $cond: { if: { $ne: ["$bot_response", null] }, then: 1, else: 0 } }
            ]
          }
        }
      },
      { $group: { _id: null, totalMessages: { $sum: "$totalMessages" } } }
    ]);

    const messageCount = totalMessages.length ? totalMessages[0].totalMessages : 0;

    // Calculate total sessions (unique session_ids)
    const totalSessions = await Chat.distinct('session_id').countDocuments();

    // Calculate total unique chatbots (unique user_ids or chatbot_ids)
    const uniqueChatbots = await ChatbotModel.distinct('userid');
    const totalChatbots = uniqueChatbots.length;

    // Return the stats as JSON response
    res.status(200).json({
      totalMessages: messageCount,
      totalSessions,
      totalChatbots
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


export const adminMostAskedQuestionsController = async (req, res) => {
    try {
        const questions = await Chat.aggregate([
            {
                $project: {
                    user_message: {
                        $trim: { input: { $toLower: "$user_message" } } 
                    }
                }
            },
            {
                $group: {
                    _id: "$user_message", 
                    count: { $sum: 1 },    
                },
            },
            { $sort: { count: -1 } },   // Sort by the most frequently asked question
            { $limit: 6 },             // Limit to top 10 most asked questions across all chatbots
        ]);

        // Check if questions were found
        if (questions.length === 0) {
            return res.status(404).json({ message: "No questions found." });
        }

        // Return the top 10 most asked questions with their counts
        res.status(200).json({
            message: "Most asked questions fetched successfully.",
            data: questions
        });

    } catch (error) {
        console.error("Error while fetching most asked questions:", error.message);
        // Send a 500 error response if something went wrong
        res.status(500).json({
            message: "Error fetching most asked questions.",
            error: error.message
        });
    }
};
