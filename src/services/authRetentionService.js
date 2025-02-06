import Chat from "../models/chatModel.js";

/**
 * Get active users for a chatbot within a timeframe (DAU, WAU, MAU).
 */
export const getActiveUsersForChatbot = async (chatbotId, days) => {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
  
  
    const activeUsers = await Chat.find({
        chatbot_id: chatbotId,
        timestamp: { $gte: dateThreshold }  // ✅ Use `timestamp` instead
      }).lean();
      
  
  
    const uniqueSessions = [...new Set(activeUsers.map(chat => chat.session_id))];
  
    return uniqueSessions.length;
  };
  

/**
 * Calculate retention rate (percentage of last week users returning from last month).
 */
export const getRetentionRateForChatbot = async (chatbotId) => {
  const lastWeekUsers = await getActiveUsersForChatbot(chatbotId, 7);
  const lastMonthUsers = await getActiveUsersForChatbot(chatbotId, 30);

  return lastMonthUsers === 0 ? 0 : ((lastWeekUsers / lastMonthUsers) * 100).toFixed(2);
};
