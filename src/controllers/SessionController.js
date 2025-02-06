
import { getChatsBySession, getSessionsByChatbotId } from "../services/SessionService.js";

export const fetchSessionsByChatbotId = async (req, res) => {
  const { chatbotId } = req.params;

  if (!chatbotId) {
    return res.status(400).json({ error: "Chatbot ID is required" });
  }

  try {
    const sessions = await getSessionsByChatbotId(chatbotId);

    if (sessions.length === 0) {
      return res.status(404).json({ error: "No sessions found for this chatbot" });
    }

    res.json({ chatbotId, totalChats: sessions.length, sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const fetchChatsBySession = async (req, res) => {
  const { sessionId } = req.params;  

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  try {
    const chats = await getChatsBySession(sessionId);

    if (chats.length === 0) {
      return res.status(404).json({ error: "No chats found for this session" });
    }

    res.json({ sessionId, chats });
  } catch (error) {
    console.error("Error fetching chats:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


