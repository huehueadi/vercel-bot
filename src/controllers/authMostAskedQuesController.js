import { mostAskedQuestionsService } from "../services/authMostAskedQuestions.js";
export const getMostAskedQuestionsController = async (req, res) => {
    const { chatbot_id } = req.params;  
    try {
        const mostAskedQuestions = await mostAskedQuestionsService(chatbot_id);
        res.status(200).json(mostAskedQuestions);  
    } catch (error) {
        res.status(500).json({ message: error.message });  
    }
};
