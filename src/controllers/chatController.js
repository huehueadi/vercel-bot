// import AWS from 'aws-sdk';
// import axios from 'axios';
// import Chat from '../models/chatModel.js';
// import ScrapedData from '../models/scrappedDataModel.js';
// import { generateResponse } from '../services/aiService.js';
// import { v4 as uuidv4 } from 'uuid'; // Import UUID for generating session tokens

// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// export const handleChat = async (req, res) => {
//   const { message } = req.body;
//   const { userid } = req.params;

//   // Check if the message is provided
//   if (!message) {
//     return res.status(400).json({ error: 'Message is required' });
//   }

//   // Check if the UUID for the scraped data is provided
//   if (!userid) {
//     return res.status(400).json({ error: 'UUID for the scraped data is required' });
//   }

//   // Retrieve session token from cookies
//   let sessionToken = req.cookies?.['session-token'];
//   console.log('Session Token from cookies:', sessionToken);
//   console.log('Cookies in request:', req.cookies);

//   // If session token does not exist, create a new one and store it in the cookie
//   if (!sessionToken) {
//     sessionToken = uuidv4(); // Generate a new session token (UUID)
//     res.cookie('session-token', sessionToken, {
//       maxAge: 3 * 60 * 1000, // Cookie expires after 3 minutes
//       secure: false,          // Set to false for local development (use 'true' in production with HTTPS)
//       sameSite: 'None',        // SameSite Lax for local dev (Strict for production)
//       httpOnly: true,         // Makes the cookie inaccessible to JavaScript (for security)
//     });
    
//   }
//   console.log('Session Token after generating', sessionToken);


//   try {
//     // Fetch the scraped data record from the database
//     const scrapedDataRecord = await ScrapedData.findOne({ userid });
//     if (!scrapedDataRecord) {
//       return res.status(404).json({ error: 'Scraped data not found for the provided UUID' });
//     }

//     // Fetch the actual scraped data from S3
//     const s3Data = await fetchDataFromS3(scrapedDataRecord.s3Url);

//     // Check if scraped data is valid
//     if (!s3Data || s3Data.length === 0) {
//       return res.status(400).json({ error: 'No valid scraped data found' });
//     }

//     // Format the scraped data and user message into a prompt for AI
//     const formattedPrompt = formatScrapedDataForAI(s3Data, message);

//     // Generate a response using the AI service
//     const botResponse = await generateResponse(formattedPrompt);

//     // Log the chat for future reference, associating it with the session token
//     const chatLog = new Chat({
//       user_message: message,
//       bot_response: botResponse,
//       session_token: sessionToken, // Store the session token in the chat log
//       chatbot_id: scrapedDataRecord.userid,
//     });

//     // Save the chat log to the database
//     await chatLog.save();

//     // Send the AI response back to the user
//     res.json({ response: botResponse });
//   } catch (err) {
//     console.error('Error handling chat:', err.message);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// // Function to format the scraped data for AI
// const formatScrapedDataForAI = (scrapedData, userQuery) => {
//   // Join the scraped data if it's an array of text
//   const formattedText = Array.isArray(scrapedData) 
//     ? scrapedData.join("\n\n") 
//     : scrapedData;  // If it's a string, just use it as is

//   if (!formattedText) {
//     console.error("Formatted text is empty");
//   }

//   console.log("Formatted Text for AI:", formattedText);  // Debugging line

//   // Create the prompt with both the scraped data and the user's query
//   return `Here is website data:\n\n${formattedText}\n\nUser's question answer in short: ${userQuery}\nResponse:`;
// };

// const fetchDataFromS3 = async (s3Url) => {
//   try {
//     const response = await axios.get(s3Url);

//     // Log the full response and type of scrapedData for debugging
//     const scrapedData = response.data;
//     console.log("Full S3 Response:", response);  
//     console.log("Fetched S3 Data:", scrapedData);  // Log the data itself
//     console.log("Type of Fetched Data:", typeof scrapedData);  // Log the type of scrapedData

//     // If it's an array, process each item
//     if (Array.isArray(scrapedData)) {
//       let filteredData = [];

//       scrapedData.forEach((item, index) => {
//         console.log(`Processing item #${index}:`, item);  // Log each item to understand its structure

//         // Check for 'paragraphs' and 'links' keys
//         if (item.paragraphs && Array.isArray(item.paragraphs)) {
//           const validParagraphs = item.paragraphs.filter(paragraph => paragraph.trim() !== "" && paragraph !== "Test Mode");
//           filteredData.push(...validParagraphs);
//         } else {
//           console.log(`Item #${index} does not have valid 'paragraphs' key or it's not an array.`);
//         }

//         if (item.links && Array.isArray(item.links)) {
//           const validLinks = item.links.filter(link => typeof link === 'string' && link.includes("http"));
//           filteredData.push(...validLinks);
//         } else {
//           console.log(`Item #${index} does not have valid 'links' key or it's not an array.`);
//         }
//       });

//       // If filteredData has valid paragraphs or links, return them
//       if (filteredData.length > 0) {
//         console.log("Filtered Data:", filteredData);  // Log the filtered data
//         return filteredData.join("\n\n");  // Return the joined string
//       } else {
//         console.log("No valid paragraphs or links found.");
//       }
//     } else if (typeof scrapedData === 'object') {
//       // If scrapedData is an object, log it and handle differently (you can decide on processing logic here)
//       console.log("S3 Data is an object, not an array.");
//       return JSON.stringify(scrapedData);  // Example: Just stringify the object if it's not an array
//     } else {
//       console.log("S3 Data is neither an array nor an object.");
//       return '';  // Return empty if data is neither an array nor an object
//     }

//     // If no valid data was found or not processed, return empty string
//     return '';
//   } catch (error) {
//     console.error('Error fetching data from S3:', error);
//     throw new Error('Failed to fetch data from S3');
//   }
// };



import AWS from 'aws-sdk';
import axios from 'axios';
import Chat from '../models/chatModel.js';
import ScrapedData from '../models/scrappedDataModel.js';
import { generateResponse } from '../services/aiService.js';
import { v4 as uuidv4 } from 'uuid'; // Import UUID for session IDs
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const SESSION_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

export const handleChat = async (req, res) => {
  const { message } = req.body;
  const { userid } = req.params;
  let sessionId = req.cookies?.sessionId; // Retrieve session ID from cookies
  let lastActivity = req.cookies?.lastActivity; // Retrieve last activity timestamp from cookies

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!userid) {
    return res.status(400).json({ error: 'UUID for the scraped data is required' });
  }

  try {
    const currentTimestamp = Date.now(); // Current timestamp for session expiry check

    // Check if session is expired (no activity for 5 minutes)
    if (sessionId && lastActivity && currentTimestamp - lastActivity > SESSION_EXPIRY_TIME) {
      console.log("Session expired due to inactivity");
      sessionId = null; // Expire session
      res.clearCookie('sessionId');
      res.clearCookie('lastActivity');
    }

    // Generate a new session if it doesn't exist
    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: true, // Set to true if using HTTPS
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7-day expiry
      });
      res.cookie('lastActivity', currentTimestamp, {
        httpOnly: true,
        secure: true, // Set to true if using HTTPS
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7-day expiry
      });
    } else {
      // Update the last activity timestamp on each new message
      res.cookie('lastActivity', currentTimestamp, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7-day expiry
      });
    }

    // Fetch the scraped data record from the database
    const scrapedDataRecord = await ScrapedData.findOne({ userid });
    if (!scrapedDataRecord) {
      return res.status(404).json({ error: 'Scraped data not found for the provided UUID' });
    }

    // Fetch the actual scraped data from S3
    const s3Data = await fetchDataFromS3(scrapedDataRecord.s3Url);

    if (!s3Data || s3Data.length === 0) {
      return res.status(400).json({ error: 'No valid scraped data found' });
    }

    // Format the scraped data and user message into a prompt
    const formattedPrompt = formatScrapedDataForAI(s3Data, message);

    // Generate a response using the AI service
    const botResponse = await generateResponse(formattedPrompt);

    // Log the chat for future reference
    const chatLog = new Chat({
      user_message: message,
      bot_response: botResponse,
      chatbot_id: scrapedDataRecord.userid,
      session_id: sessionId, 
    });
    await chatLog.save();
    console.log(chatLog);

    // Send the response back to the user
    res.json({ response: botResponse });
  } catch (err) {
    console.error('Error handling chat:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Function to format the scraped data for AI
const formatScrapedDataForAI = (scrapedData, userQuery) => {
  const formattedText = Array.isArray(scrapedData) 
    ? scrapedData.join("\n\n") 
    : scrapedData; 

  console.log("Formatted Text for AI:", formattedText);

  return `Here is website data:\n\n${formattedText}\n\nUser's question answer in short: ${userQuery}\nResponse:`;
};

const fetchDataFromS3 = async (s3Url) => {
  try {
    const response = await axios.get(s3Url);

    if (!response.data) {
      throw new Error('No data returned from S3');
    }

    const scrapedData = response.data;

    // Log the structure and type of the data for debugging
    console.log("Full S3 Response:", response);
    console.log("Fetched S3 Data:", scrapedData);
    console.log("Type of Fetched Data:", typeof scrapedData);  // Log the type
    console.log("Is Array?", Array.isArray(scrapedData)); // Check if it's an array

    // If it's an array, process as usual
    if (Array.isArray(scrapedData)) {
      let filteredData = [];

      scrapedData.forEach((item, index) => {
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
      console.log("S3 Data is an object. Returning JSON stringified data.");
      return JSON.stringify(scrapedData); // Handle the case where data is an object
    } else {
      throw new Error('S3 data format is not recognized.');
    }
  } catch (error) {
    console.error('Error fetching data from S3:', error.message);
    throw new Error('Failed to fetch data from S3: ' + error.message);
  }
};

