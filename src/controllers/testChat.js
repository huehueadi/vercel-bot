import AWS from 'aws-sdk';
import axios from 'axios';
import Chat from '../models/chatModel.js';
import ScrapedData from '../models/scrappedDataModel.js';
import { generateResponse } from '../services/aiService.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { SpeechClient } from '@google-cloud/speech'; // Google Cloud Speech Client
import fs from 'fs';

dotenv.config();

// Initialize AWS S3
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

const speechClient = new SpeechClient();

export const testChat = async (req, res) => {
  const { message, audioFile } = req.body; 
  const { userid } = req.params;

  let session_id = req.headers['session-id']; 

  if (!message && !audioFile) {
    return res.status(400).json({ error: 'Message or Audio file is required' });
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

    let userMessage = message;

    if (audioFile) {
      userMessage = await convertAudioToText(audioFile); 
    }

    const formattedPrompt = formatScrapedDataForAI(s3Data, userMessage);

    const botResponse = await generateResponse(formattedPrompt);

    const chatLog = new Chat({
      user_message: userMessage,
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

const convertAudioToText = async (audioFile) => {
  try {
    const tempAudioFilePath = './temp_audio.wav';
    fs.writeFileSync(tempAudioFilePath, audioFile); 

    const audioBytes = fs.readFileSync(tempAudioFilePath).toString('base64');

    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    };

    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    fs.unlinkSync(tempAudioFilePath);

    return transcription;
  } catch (error) {
    console.error('Error converting audio to text:', error.message);
    throw new Error('Failed to convert audio to text');
  }
};

const formatScrapedDataForAI = (scrapedData, userQuery) => {
  const formattedText = Array.isArray(scrapedData) 
    ? scrapedData.join("\n\n") 
    : scrapedData; 

  return `Here is website data:\n\n${formattedText}\n\nUser's question answer in short: ${userQuery}\nResponse:`;
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
