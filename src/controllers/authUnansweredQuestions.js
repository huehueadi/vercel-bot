import { getUnansweredQuestionsService } from "../services/authUnansweredQuestions.js";

export const getUnansweredQuestionsController = async (req, res) => {
    const { chatbot_id } = req.params;  // Get chatbot_id from request params
    try {
        const unansweredQuestions = await getUnansweredQuestionsService(chatbot_id);
        res.status(200).json(unansweredQuestions);  // Send the unanswered questions as a response
    } catch (error) {
        res.status(500).json({ message: error.message });  // Handle any errors
    }
};
