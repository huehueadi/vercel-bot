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
import { adminMostAskedQuestionsController, deleteChatbot, deleteUser, getAllChatbots, getAllUsers, getChatbotById, getStats, getUserById, updateChatbot, updateUser } from '../controllers/authAdminController.js';
import { getDashboardOptions } from '../controllers/authGetDashboardOptions.js';
import { getRetentionData } from '../controllers/authRetentionController.js';
import { getTotalMessagesForChatbot } from '../controllers/authTotalMessagesController.js';
import { actionController, permissionController } from '../controllers/authActionController.js';
import { createRole } from '../controllers/authRoleController.js';


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
router.get('/retention/:chatbotId', getRetentionData);
router.get('/messages/:chatbot_id', getTotalMessagesForChatbot);

router.post('/addaction', actionController);
router.post('/addpermission', permissionController);
router.post('/addrole', createRole);


//dashboard
router.get('/dashboard/options', authentication(), getDashboardOptions);

// Admin Routes
router.get('/admin/most-asked',authentication('admin'), adminMostAskedQuestionsController)
router.get('/admin/users', authentication('admin'), getAllUsers);                 // Get all users
router.get('/admin/getstats', authentication('admin'), getStats);                 // Get all users

router.get('/admin/users/:username',authentication('admin'), getUserById);             // Get user by ID
router.get('/admin/chatbots',authentication('admin'), getAllChatbots);           // Get all chatbots
router.get('/admin/chatbots/:id',authentication('admin'), getChatbotById);       // Get chatbot by ID
router.delete('/admin/users/:id',authentication('admin'), deleteUser);           // Delete user
router.delete('/admin/chatbots/:id',authentication('admin'), deleteChatbot);     // Delete chatbot
router.put('/admin/users/:id',authentication('admin'), updateUser);              // Update user
router.put('/admin/chatbots/:id',authentication('admin'), updateChatbot);        // Update chatbot

export default router;