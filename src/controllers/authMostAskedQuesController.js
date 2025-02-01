import { mostAskedQuestionsService } from "../services/authMostAskedQuestions.js";
export const getMostAskedQuestionsController = async (req, res) => {
    const { chatbot_id } = req.params;  // Assuming the chatbot_id is passed in the URL params
    try {
        const mostAskedQuestions = await mostAskedQuestionsService(chatbot_id);
        res.status(200).json(mostAskedQuestions);  // Send the top questions as a response
    } catch (error) {
        res.status(500).json({ message: error.message });  // Handle errors
    }
};
