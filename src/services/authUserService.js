import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import ChatbotModel from "../models/userModel.js";

export const chatbotRegister = async (username, password, role = "user") => {
  try {
    // Check if username already exists
    const existingUser = await ChatbotModel.findOne({ username });
    if (existingUser) throw new Error("Username already exists, choose another.");

    // Generate unique user ID
    const generatedUserId = uuidv4();

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new ChatbotModel({
      username,
      password: hashedPassword,
      userid: generatedUserId,
      role,  // Set role (default: "user")
    });

    await newUser.save();

    return { success: true, message: "User registered successfully." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};



export const chatbotLoginService = async (username, password) => {
  try {
    const user = await ChatbotModel.findOne({ username });

    if (!user) throw new Error("Username not found.");

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error("Incorrect password.");

    // Token payload now includes role
    const payload = {
      userId: user.userid,
      username: user.username,
      role: user.role,  // Add role
    };

    // Generate JWT
    const token = jwt.sign(payload, "key", { expiresIn: "1h" });

    return { success: true, message: "Login successful.", token, payload };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
