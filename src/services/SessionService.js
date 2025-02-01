import Chat from '../models/chatModel.js';

// Get all sessions for a specific chatbot_id
export const getSessionsByChatbotId = async (chatbotId) => {
  try {
    // Find all unique session IDs related to the chatbot_id
    return await Chat.distinct("session_id", { chatbot_id: chatbotId });
  } catch (error) {
    throw new Error("Error fetching sessions by chatbot_id: " + error.message);
  }
};




export const getChatsBySession = async (sessionId) => {
  try {
    // Query chats by session token and sort by creation time in ascending order
    const chats = await Chat.find({ session_id: sessionId }).sort({ createdAt: 1 });

    // If no chats are found, return an empty array
    if (chats.length === 0) {
      console.log(`No chats found for session ${sessionId}`);
    }

    return chats;
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error fetching chats:", error.message);
    throw new Error("Error fetching chats: " + error.message);
  }
};
