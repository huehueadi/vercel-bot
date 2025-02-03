import express from 'express';
import { handleGetChats } from '../controllers/authGetChatController.js';
import { getMostAskedQuestionsController } from '../controllers/authMostAskedQuesController.js';
import { getUnansweredQuestionsController } from '../controllers/authUnansweredQuestions.js';
import { loginChatbot, registerChatbot } from '../controllers/authUserController.js';
import { handleChat } from '../controllers/chatController.js';
// import { scrapeWebsiteController } from '../controllers/scrapingController.js';
import authentication from '../middleware/authenticationMiddleware.js';
import { fetchChatsBySession, fetchSessionsByChatbotId } from '../controllers/SessionController.js';
import { cheerioscrapeWebsiteController } from '../controllers/cherioController.js';
import { puppeteerScrapeWebsiteController } from '../controllers/scrapingController.js';
import { deleteChatbot, deleteUser, getAllChatbots, getAllUsers, getChatbotById, getStats, getUserById, updateChatbot, updateUser } from '../controllers/authAdminController.js';
import { getDashboardOptions } from '../controllers/authGetDashboardOptions.js';


const router = express.Router();

router.post('/chat/:userid', handleChat);
// router.post('/chat', generateContentFromUserInput);

// router.post('/scrape',authentication,scrapeWebsiteController);
router.post('/register', registerChatbot)
router.post('/get',loginChatbot)
router.get('/getchats/:chatbot_id' ,handleGetChats)
router.get('/most-asked/:chatbot_id', getMostAskedQuestionsController)
router.get('/unanswered/:chatbot_id', getUnansweredQuestionsController)
router.get('/sessions/:chatbotId', fetchSessionsByChatbotId); 
router.get('/sessions/:sessionId/chats', fetchChatsBySession); 
// router.post('/t1/chat', handleUserInput);
router.post('/t1/scrape',authentication(), puppeteerScrapeWebsiteController );
// router.post('/generate-content', generateContentController);
router.post('/cheerio', authentication(), cheerioscrapeWebsiteController);

//dashboard
router.get('/dashboard/options', authentication(), getDashboardOptions);

// Admin Routes

router.get('/admin/users', authentication(), getAllUsers);                 // Get all users
router.get('/admin/getstats', authentication(), getStats);                 // Get all users

router.get('/admin/users/:username',authentication(), getUserById);             // Get user by ID
router.get('/admin/chatbots',authentication(), getAllChatbots);           // Get all chatbots
router.get('/admin/chatbots/:id',authentication(), getChatbotById);       // Get chatbot by ID
router.delete('/admin/users/:id',authentication(), deleteUser);           // Delete user
router.delete('/admin/chatbots/:id',authentication(), deleteChatbot);     // Delete chatbot
router.put('/admin/users/:id',authentication(), updateUser);              // Update user
router.put('/admin/chatbots/:id',authentication(), updateChatbot);        // Update chatbot

export default router;