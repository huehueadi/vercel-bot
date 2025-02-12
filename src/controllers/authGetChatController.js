import { getChats } from "../services/authGetChatService.js";

export const handleGetChats = async (req, res) => {
  const { chatbot_id } = req.params;  
  console.log("Received chatbot_id:", chatbot_id);  

  try {
    // Attempt to get chats for the given chatbot_id
    const chats = await getChats(chatbot_id);

    if (!chats || chats.length === 0) {
      // Handle the case where no chats are found
      return res.status(404).json({
        message: "No chats found for this chatbot.",
        success: false
      });
    }

    // Return chats successfully
    return res.status(200).json({
      message: "Chats retrieved successfully",
      success: true,
      chats
    });
  } catch (error) {
    console.log("Error in retrieving chats:", error.message);

    // Return a generic error message in case of failure
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve chats"
    });
  }
};
