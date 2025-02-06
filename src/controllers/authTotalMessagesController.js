import Chat from "../models/chatModel.js";

export const getTotalMessagesForChatbot = async (req, res) => {
    const { chatbot_id } = req.params;  // Get chatbot_id from route parameter
  
    if (!chatbot_id) {
      return res.status(400).json({ error: 'chatbot_id is required' });
    }
  
    try {
      // Query the Chat model to count messages for the given chatbot_id
      const messageCount = await Chat.countDocuments({ chatbot_id });
  
      // Respond with the total number of messages
      res.json({ totalMessages: messageCount });
    } catch (err) {
      console.error('Error retrieving message count:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  };