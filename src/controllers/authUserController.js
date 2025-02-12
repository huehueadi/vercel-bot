import { chatbotLoginService, chatbotRegister } from "../services/authUserService.js";

export const registerChatbot = async (req, res) => {
  const { username, password, role } = req.body;  

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Please provide username and password." });
  }

  try {
    const result = await chatbotRegister(username, password, role);

    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const loginChatbot = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Please provide both username and password." });
  }

  try {
    const result = await chatbotLoginService(username, password);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
