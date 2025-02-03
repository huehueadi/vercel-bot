import mongoose from "mongoose";

const registerChatbotSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    userid: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["user", "admin"], // Only "user" or "admin" allowed
        default: "user" // Default role is "user"
    }
});

const ChatbotModel = mongoose.model("ChatbotModel", registerChatbotSchema);

export default ChatbotModel;
