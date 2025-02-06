import Chat from "../models/chatModel.js";

export const mostAskedQuestionsService = async (chatbotId) => {
    try {
        const questions = await Chat.aggregate([
            { 
                $match: { chatbot_id: chatbotId }  
            },
            {
                $group: {
                    _id: "$user_message",  
                    count: { $sum: 1 },     
                },
            },
            { $sort: { count: -1 } }, 
            { $limit: 5 },           
        ]);
        
        return questions;
    } catch (error) {
        console.log("Error while fetching most asked questions:", error.message);
        throw new Error("Error while fetching most asked questions");
    }
};

