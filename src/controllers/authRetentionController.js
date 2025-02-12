import { getActiveUsersForChatbot, getRetentionRateForChatbot } from "../services/authRetentionService.js";

export const getRetentionData = async (req, res) => {
  const { chatbotId } = req.params;

  try {
    // Fetching active users data for DAU, WAU, and MAU
    const dau = await getActiveUsersForChatbot(chatbotId, 1);
    const wau = await getActiveUsersForChatbot(chatbotId, 7);
    const mau = await getActiveUsersForChatbot(chatbotId, 30);
    
    // Fetching retention rate for the chatbot
    const retention = await getRetentionRateForChatbot(chatbotId);

    // Return a structured response with retention data
    return res.status(200).json({
      success: true,
      message: "Retention metrics fetched successfully.",
      data: {
        chatbotId,
        DAU: dau,
        WAU: wau,
        MAU: mau,
        RetentionRate: `${retention}%`
      }
    });
  } catch (error) {
    console.error('Error fetching retention metrics:', error);
    // Returning error response with a message
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch retention metrics'
    });
  }
};
