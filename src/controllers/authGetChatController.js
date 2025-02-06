import { getChats } from "../services/authGetChatService.js";
export const handleGetChats = async (req, res) => {
  const { chatbot_id } = req.params;  
  console.log("Received chatbot_id:", chatbot_id);  

  try {
    const chats = await getChats(chatbot_id);

    res.status(200).json({ message: "Chats retrieved successfully", chats:chats });
  } catch (error) {
    console.log("Error in retrieving chats:", error.message);
    res.status(500).json({ error: error.message || "Failed to retrieve chats" });
  }
};
