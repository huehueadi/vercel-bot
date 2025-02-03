import express from 'express';
import { deleteChatbot, deleteUser, getAllChatbots, getAllUsers, getChatbotById, getUserById, updateChatbot, updateUser } from '../controllers/authAdminController.js';

const router = express.Router()

// import {
//   getAllUsers,
//   getUserById,
//   getAllChatbots,
//   getChatbotById,
//   deleteUser,
//   deleteChatbot,
//   updateUser,
//   updateChatbot,
//   assignUserRole
// } from '../controllers/adminController.js';  // Assuming admin controller exists


// Admin Routes

router.get('/admin/users', getAllUsers);                 // Get all users
router.get('/admin/users/:id', getUserById);             // Get user by ID
router.get('/admin/chatbots', getAllChatbots);           // Get all chatbots
router.get('/admin/chatbots/:id', getChatbotById);       // Get chatbot by ID
router.delete('/admin/users/:id', deleteUser);           // Delete user
router.delete('/admin/chatbots/:id', deleteChatbot);     // Delete chatbot
router.put('/admin/users/:id', updateUser);              // Update user
router.put('/admin/chatbots/:id', updateChatbot);        // Update chatbot


export default router;