import { mostAskedQuestionsService } from "../services/authMostAskedQuestions.js";

export const getMostAskedQuestionsController = async (req, res) => {
  const { chatbot_id } = req.params;

  try {
    // Get most asked questions from the service
    const mostAskedQuestions = await mostAskedQuestionsService(chatbot_id);

    // Check if no questions are found
    if (!mostAskedQuestions || mostAskedQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No most asked questions found for this chatbot."
      });
    }

    // Return the most asked questions
    return res.status(200).json({
      success: true,
      message: "Most asked questions retrieved successfully.",
      data: mostAskedQuestions
    });
  } catch (error) {
    console.error("Error fetching most asked questions:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve most asked questions."
    });
  }
};
