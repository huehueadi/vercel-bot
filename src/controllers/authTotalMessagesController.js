import Chat from "../models/chatModel.js";

export const getTotalMessagesForChatbot = async (req, res) => {
    const { chatbot_id } = req.params;  
  
    if (!chatbot_id) {
      return res.status(400).json({ error: 'chatbot_id is required' });
    }
  
    try {
      const messageCount = await Chat.countDocuments({ chatbot_id });
  
      res.json({ totalMessages: messageCount });
    } catch (err) {
      console.error('Error retrieving message count:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  };