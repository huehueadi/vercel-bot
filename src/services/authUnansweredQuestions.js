import Chat from "../models/chatModel.js";

export const getUnansweredQuestionsService = async (chatbotId) => {
    try {
        const unansweredQuestions = await Chat.aggregate([
            {
                $match: {
                    chatbot_id: chatbotId,  
                    bot_response: {
                        $regex: /sorry|i can't help|i don't know|i don't understand|provided text doesn't contain|text does not contain information|there is no mention of \" \" in the provided website data|does not contain information|unable to assist|i am not able to provide that information|there is no data on that|i don't have information about that|the information you're asking for isn't available|this information is missing from the data|the provided data does not include|i cannot find any information about that|this data doesn't include|no data available on that|this topic isn't covered in the data|the data provided does not contain|i couldn't find any reference to that|no relevant data in the provided content|this content doesn't cover|the source data doesn't have that|i can't locate any information on that|this information isn't in the provided text|the document doesn't mention|this is not mentioned in the data|the current data does not include|this is not part of the available information|i don't have access to that data|the dataset does not contain|this is outside the scope of the provided data|the content does not contain any reference|the details are not available in the data|There is no information about|That's not related to this website|this is not covered in the information given|the provided text doesn't mention|there's no mention of that in the data|there's no relevant info in the content/i
                      }  
                }
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

        return unansweredQuestions;
    } catch (error) {
        console.log("Error while fetching unanswered questions:", error.message);
        throw new Error("Error while fetching unanswered questions");
    }
};
