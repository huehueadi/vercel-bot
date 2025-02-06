
import { getActiveUsersForChatbot, getRetentionRateForChatbot } from "../services/authRetentionService.js";

export const getRetentionData = async (req, res) => {
  try {
    const { chatbotId } = req.params;

    const dau = await getActiveUsersForChatbot(chatbotId, 1);
    const wau = await getActiveUsersForChatbot(chatbotId, 7);
    const mau = await getActiveUsersForChatbot(chatbotId, 30);
    const retention = await getRetentionRateForChatbot(chatbotId);

    res.json({ chatbotId, DAU: dau, WAU: wau, MAU: mau, RetentionRate: `${retention}%` });
  } catch (error) {
    console.error('Error fetching retention metrics:', error);
    res.status(500).json({ error: 'Failed to fetch retention metrics' });
  }
};
