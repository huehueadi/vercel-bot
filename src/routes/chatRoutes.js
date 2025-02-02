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
router.post('/t1/scrape',authentication, puppeteerScrapeWebsiteController );
// router.post('/generate-content', generateContentController);


router.post('/cheerio', authentication, cheerioscrapeWebsiteController);



export default router;