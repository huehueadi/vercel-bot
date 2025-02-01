// import { getSessionsByChatbotId, getChatsBySession } from '../services/sessionService.js';

import { getChatsBySession, getSessionsByChatbotId } from "../services/SessionService.js";

// Controller: Get all sessions for a specific chatbot_id
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

    // Add the total count of sessions to the response
    res.json({ chatbotId, totalChats: sessions.length, sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Controller: Get all chats for a specific session
// chatController.js
export const fetchChatsBySession = async (req, res) => {
  const { sessionId } = req.params;  // Expecting sessionId in the route params

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  try {
    // Fetch chats by session from the service layer
    const chats = await getChatsBySession(sessionId);

    if (chats.length === 0) {
      return res.status(404).json({ error: "No chats found for this session" });
    }

    // Return the fetched chats in the response
    res.json({ sessionId, chats });
  } catch (error) {
    console.error("Error fetching chats:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


