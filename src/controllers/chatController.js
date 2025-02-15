
import AWS from 'aws-sdk';
import axios from 'axios';
import Chat from '../models/chatModel.js';
import ScrapedData from '../models/scrappedDataModel.js';
import { generateResponse } from '../services/aiService.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const SESSION_EXPIRY_TIME = 24 * 60 * 60 * 1000; 

const generateSessionId = () => {
  const uniquePart = uuidv4().split('-')[0]; 
  return `session-${uniquePart}`;
};

export const handleChat = async (req, res) => {
  const { message } = req.body;
  const { userid } = req.params;
  
  let session_id = req.headers['session-id']; 

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!userid) {
    return res.status(400).json({ error: 'UUID for the scraped data is required' });
  }

  try {
    if (!session_id) {
      session_id = generateSessionId();
    }

    const scrapedDataRecord = await ScrapedData.findOne({ userid });
    if (!scrapedDataRecord) {
      return res.status(404).json({ error: 'Scraped data not found for the provided UUID' });
    }

    const s3Data = await fetchDataFromS3(scrapedDataRecord.s3Url);
    if (!s3Data || s3Data.length === 0) {
      return res.status(400).json({ error: 'No valid scraped data found' });
    }

    const previousChats = await Chat.find({ session_id })
      .sort({ createdAt: 1 }) // Sort in order of chat history
      .limit(5); // Limit messages to avoid exceeding token limits

    // Format previous chat messages
    let chatHistory = previousChats.map(chat => `User: ${chat.user_message}\nBot: ${chat.bot_response}`).join("\n\n");

    // Format final prompt for AI model
    const formattedPrompt = formatScrapedDataForAI(s3Data, message, chatHistory);

    // Generate response using AI
    const botResponse = await generateResponse(formattedPrompt);

    // Save chat history to database
    const chatLog = new Chat({
      user_message: message,
      bot_response: botResponse,
      chatbot_id: scrapedDataRecord.userid,
      session_id: session_id, 
    });
    await chatLog.save();

    res.json({ 
      response: botResponse,
      session_id: session_id,  
    });

  } catch (err) {
    console.error('Error handling chat:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const formatScrapedDataForAI = (scrapedData, userQuery, chatHistory) => {
  const formattedText = Array.isArray(scrapedData) 
    ? scrapedData.join("\n\n") 
    : scrapedData; 

  return `Here is website data:\n\n${formattedText}\n\nPrevious Conversation:\n${chatHistory}\n\nUser's Question: ${userQuery}\nResponse:`;
};


const fetchDataFromS3 = async (s3Url) => {
  try {
    const response = await axios.get(s3Url);

    if (!response.data) {
      throw new Error('No data returned from S3');
    }

    const scrapedData = response.data;

    if (Array.isArray(scrapedData)) {
      let filteredData = [];

      scrapedData.forEach((item) => {
        if (item.paragraphs && Array.isArray(item.paragraphs)) {
          const validParagraphs = item.paragraphs.filter(paragraph => paragraph.trim() !== "" && paragraph !== "Test Mode");
          filteredData.push(...validParagraphs);
        }

        if (item.links && Array.isArray(item.links)) {
          const validLinks = item.links.filter(link => typeof link === 'string' && link.includes("http"));
          filteredData.push(...validLinks);
        }
      });

      if (filteredData.length > 0) {
        return filteredData.join("\n\n");
      } else {
        throw new Error('No valid paragraphs or links found in the S3 data.');
      }
    } else if (typeof scrapedData === 'object') {
      return JSON.stringify(scrapedData); 
    } else {
      throw new Error('S3 data format is not recognized.');
    }
  } catch (error) {
    console.error('Error fetching data from S3:', error.message);
    throw new Error('Failed to fetch data from S3: ' + error.message);
  }
};


// import AWS from 'aws-sdk';
// import axios from 'axios';
// import Chat from '../models/chatModel.js';
// import ScrapedData from '../models/scrappedDataModel.js';
// import { generateResponse } from '../services/aiService.js';
// import { v4 as uuidv4 } from 'uuid'; // Import UUID for session IDs
// import dotenv from 'dotenv';

// // Load environment variables from the .env file
// dotenv.config();

// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// const SESSION_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

// export const handleChat = async (req, res) => {
//   const { message } = req.body;
//   const { userid } = req.params;
//   let sessionId = req.cookies?.sessionId; // Retrieve session ID from cookies
//   let lastActivity = req.cookies?.lastActivity; // Retrieve last activity timestamp from cookies

//   if (!message) {
//     return res.status(400).json({ error: 'Message is required' });
//   }

//   if (!userid) {
//     return res.status(400).json({ error: 'UUID for the scraped data is required' });
//   }

//   try {
//     const currentTimestamp = Date.now(); // Current timestamp for session expiry check

//     // Check if session is expired (no activity for 5 minutes)
//     if (sessionId && lastActivity && currentTimestamp - lastActivity > SESSION_EXPIRY_TIME) {
//       console.log("Session expired due to inactivity");
//       sessionId = null; // Expire session
//       res.clearCookie('sessionId');
//       res.clearCookie('lastActivity');
//     }

//     // Generate a new session if it doesn't exist
//     if (!sessionId) {
//       sessionId = uuidv4();
//       res.cookie('sessionId', sessionId, {
//         httpOnly: true,
//         secure: true, // Set to true if using HTTPS
//         sameSite: 'None',
//         maxAge: 7 * 24 * 60 * 60 * 1000, // 7-day expiry
//       });
//       res.cookie('lastActivity', currentTimestamp, {
//         httpOnly: true,
//         secure: true, // Set to true if using HTTPS
//         sameSite: 'None',
//         maxAge: 7 * 24 * 60 * 60 * 1000, // 7-day expiry
//       });
//     } else {
//       // Update the last activity timestamp on each new message
//       res.cookie('lastActivity', currentTimestamp, {
//         httpOnly: true,
//         secure: true,
//         sameSite: 'None',
//         maxAge: 7 * 24 * 60 * 60 * 1000, // 7-day expiry
//       });
//     }

//     // Fetch the scraped data record from the database
//     const scrapedDataRecord = await ScrapedData.findOne({ userid });
//     if (!scrapedDataRecord) {
//       return res.status(404).json({ error: 'Scraped data not found for the provided UUID' });
//     }

//     // Fetch the actual scraped data from S3
//     const s3Data = await fetchDataFromS3(scrapedDataRecord.s3Url);

//     if (!s3Data || s3Data.length === 0) {
//       return res.status(400).json({ error: 'No valid scraped data found' });
//     }

//     // Format the scraped data and user message into a prompt
//     const formattedPrompt = formatScrapedDataForAI(s3Data, message);

//     // Generate a response using the AI service
//     const botResponse = await generateResponse(formattedPrompt);

//     // Log the chat for future reference
//     const chatLog = new Chat({
//       user_message: message,
//       bot_response: botResponse,
//       chatbot_id: scrapedDataRecord.userid,
//       session_id: sessionId, 
//     });
//     await chatLog.save();
//     console.log(chatLog);

//     // Send the response back to the user
//     res.json({ response: botResponse });
//   } catch (err) {
//     console.error('Error handling chat:', err.message);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// // Function to format the scraped data for AI
// const formatScrapedDataForAI = (scrapedData, userQuery) => {
//   const formattedText = Array.isArray(scrapedData) 
//     ? scrapedData.join("\n\n") 
//     : scrapedData; 

//   console.log("Formatted Text for AI:", formattedText);

//   return `Here is website data:\n\n${formattedText}\n\nUser's question answer in short: ${userQuery}\nResponse:`;
// };

// const fetchDataFromS3 = async (s3Url) => {
//   try {
//     const response = await axios.get(s3Url);

//     if (!response.data) {
//       throw new Error('No data returned from S3');
//     }

//     const scrapedData = response.data;

//     // Log the structure and type of the data for debugging
//     console.log("Full S3 Response:", response);
//     console.log("Fetched S3 Data:", scrapedData);
//     console.log("Type of Fetched Data:", typeof scrapedData);  // Log the type
//     console.log("Is Array?", Array.isArray(scrapedData)); // Check if it's an array

//     // If it's an array, process as usual
//     if (Array.isArray(scrapedData)) {
//       let filteredData = [];

//       scrapedData.forEach((item, index) => {
//         if (item.paragraphs && Array.isArray(item.paragraphs)) {
//           const validParagraphs = item.paragraphs.filter(paragraph => paragraph.trim() !== "" && paragraph !== "Test Mode");
//           filteredData.push(...validParagraphs);
//         }

//         if (item.links && Array.isArray(item.links)) {
//           const validLinks = item.links.filter(link => typeof link === 'string' && link.includes("http"));
//           filteredData.push(...validLinks);
//         }
//       });

//       if (filteredData.length > 0) {
//         return filteredData.join("\n\n");
//       } else {
//         throw new Error('No valid paragraphs or links found in the S3 data.');
//       }
//     } else if (typeof scrapedData === 'object') {
//       console.log("S3 Data is an object. Returning JSON stringified data.");
//       return JSON.stringify(scrapedData); // Handle the case where data is an object
//     } else {
//       throw new Error('S3 data format is not recognized.');
//     }
//   } catch (error) {
//     console.error('Error fetching data from S3:', error.message);
//     throw new Error('Failed to fetch data from S3: ' + error.message);
//   }
// };

// export const handleChat = async (req, res) => {
//   const { message } = req.body;
//   const { userid } = req.params;
//   let session_id = req.cookies?.session_id; 
//   console.log(`session recievd ;;;; ${session_id}`);

//   if (!message) {
//     return res.status(400).json({ error: 'Message is required' });
//   }

//   if (!userid) {
//     return res.status(400).json({ error: 'UUID for the scraped data is required' });
//   }

//   try {
//     // If no sessionId, create one (this only happens on the first request)
//     if (!session_id) {
//       session_id = uuidv4(); // Generate a new session ID
//       res.cookie('session_id', session_id, {
//         httpOnly: true,  // Prevent client-side access to the cookie
//         secure: false,  // Set to true only in production (when using HTTPS)
//         sameSite: 'None', // Necessary for cross-origin requests
//         maxAge: SESSION_EXPIRY_TIME,  // Cookie expiry time (1 day)
//       });
//       console.log("New session created:", session_id);
//     }
    

//     // Fetch the scraped data record from the database
//     const scrapedDataRecord = await ScrapedData.findOne({ userid });
//     if (!scrapedDataRecord) {
//       return res.status(404).json({ error: 'Scraped data not found for the provided UUID' });
//     }

//     // Fetch the actual scraped data from S3
//     const s3Data = await fetchDataFromS3(scrapedDataRecord.s3Url);

//     if (!s3Data || s3Data.length === 0) {
//       return res.status(400).json({ error: 'No valid scraped data found' });
//     }

//     // Format the scraped data and user message into a prompt
//     const formattedPrompt = formatScrapedDataForAI(s3Data, message);

//     // Generate a response using the AI service
//     const botResponse = await generateResponse(formattedPrompt);

//     // Log the chat for future reference (save session ID with chat)
//     const chatLog = new Chat({
//       user_message: message,
//       bot_response: botResponse,
//       chatbot_id: scrapedDataRecord.userid,
//       session_id: session_id, // Store session ID in the chat log
//     });
//     await chatLog.save();

//     // Send the response back to the user
//     res.json({ response: botResponse });
//   } catch (err) {
//     console.error('Error handling chat:', err.message);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };
