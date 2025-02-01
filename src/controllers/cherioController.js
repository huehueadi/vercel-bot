import { URL } from 'url';
import { parse } from 'url';  // To extract the domain from the base URL
import * as cheerio from 'cheerio';  // Cheerio for scraping
import axios from 'axios';
import AWS from 'aws-sdk';  // AWS SDK for S3
import { v4 as uuidv4 } from 'uuid';  // For generating UUIDs
import ScrapedData from '../models/scrappedDataModel.js';

const MAX_CONCURRENCY = 8;  // Number of concurrent requests
const TIMEOUT = 5000;  // Timeout for requests in ms
const visitedUrls = new Set();  // Set to track visited URLs
let totalScrapedPages = 0;  // To keep track of scraped pages
const FILE_SIZE_LIMIT = 2 * 1024 * 1024;  // 2MB size limit for in-memory response (2MB in bytes)

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// Initialize S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Delay function to add a timeout between each batch of concurrent requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to extract the domain from a given URL
const extractDomain = (url) => {
  const parsedUrl = parse(url);
  return `${parsedUrl.protocol}//${parsedUrl.hostname}`;  // Return domain like 'https://startinup.up.gov.in'
};

// Function to scrape a page's body content (paragraphs and links)
const scrapeBodyContent = async (url, domain) => {
  try {
    console.log(`Scraping page: ${url}`);  // Log the URL being scraped
    const { data } = await axios.get(url, { timeout: TIMEOUT });
    const $ = cheerio.load(data);

    // Extract paragraphs and links
    const paragraphs = new Set();
    $('p').each((index, element) => {
      paragraphs.add($(element).text().trim());  // Add paragraphs to the set for deduplication
    });

    const links = new Set();
    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        const absoluteUrl = new URL(href, url).href;
        links.add(absoluteUrl);  // Add links to the set for deduplication
      }
    });

    return { url, paragraphs: Array.from(paragraphs), links: Array.from(links) };
  } catch (error) {
    console.error(`Error scraping ${url}: ${error.message}`);
    return null;  // Return null if scraping fails
  }
};

// Function to crawl the website and collect internal links
const crawlWebsite = async (baseUrl, domain) => {
  try {
    const { data } = await axios.get(baseUrl, { timeout: TIMEOUT });
    const $ = cheerio.load(data);
    const links = new Set();

    // Find all internal links that start with the allowed domain
    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        const absoluteUrl = new URL(href, baseUrl).href;
        // Only add links from the same domain
        if (absoluteUrl.startsWith(domain) && !visitedUrls.has(absoluteUrl)) {
          links.add(absoluteUrl);  // Add to the set of links to visit
          visitedUrls.add(absoluteUrl);  // Mark as visited
        }
      }
    });

    return Array.from(links);  // Return the unique links
  } catch (error) {
    console.error(`Error crawling ${baseUrl}: ${error.message}`);
    return [];  // Return empty array if crawling fails
  }
};

// Function to upload data to S3 and store URL in the database
const uploadDataToS3 = async (data, userId) => {
  const jsonData = JSON.stringify(data, null, 2);
  const buffer = Buffer.from(jsonData, 'utf8');
  const fileName = `scraped_data_${Date.now()}.json`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,  // S3 key (file name)
    Body: buffer,
    ContentType: 'application/json',
  };

  try {
    const s3Upload = await s3.upload(params).promise();
    console.log('File uploaded successfully to S3:', s3Upload.Location);

    // After uploading, store the S3 URL in the database with userId
    const s3Url = s3Upload.Location;  // The S3 URL of the uploaded file
    const scrapedData = new ScrapedData({
      userid: userId,  // Store userId here
      s3Url: s3Url,
      uuid: uuidv4(),  // Generate a unique UUID for each record
    });

    // Save the data in the database (assuming you are using Mongoose)
    await scrapedData.save();

    return s3Url;
  } catch (error) {
    console.error('Error uploading data to S3:', error);
    throw error;
  }
};

// Function to scrape all pages concurrently with rate limiting
const scrapeAllPagesConcurrently = async (baseUrl, domain) => {
  let linksToScrape = [baseUrl];  // Start with the base URL
  visitedUrls.add(baseUrl);  // Mark the base URL as visited
  const allScrapedData = {
    paragraphs: new Set(),
    links: new Set(),
    urls: new Set(),
  };

  while (linksToScrape.length > 0) {
    // Scrape up to MAX_CONCURRENCY pages concurrently
    const currentBatch = linksToScrape.splice(0, MAX_CONCURRENCY);
    const batchResults = await Promise.all(currentBatch.map(url => scrapeBodyContent(url, domain)));

    // Filter out null results (failed requests)
    const successfulResults = batchResults.filter(result => result !== null);

    // Collect data and links from the successful results
    successfulResults.forEach(result => {
      totalScrapedPages++;
      result.paragraphs.forEach(paragraph => allScrapedData.paragraphs.add(paragraph));
      result.links.forEach(link => allScrapedData.links.add(link));
      allScrapedData.urls.add(result.url);

      // Add new links to scrape list
      result.links.forEach(link => {
        if (!visitedUrls.has(link) && link.startsWith(domain)) {
          visitedUrls.add(link);
          linksToScrape.push(link);  // Only add links from the allowed domain
        }
      });
    });

    // Monitor progress
    console.log(`Scraped ${totalScrapedPages} pages so far.`);

    // Add delay between batches to avoid overwhelming the server
    await delay(1000);  // 1-second delay between batches
  }

  // Return the merged data as arrays (converting sets to arrays)
  return {
    paragraphs: Array.from(allScrapedData.paragraphs),
    links: Array.from(allScrapedData.links),
    urls: Array.from(allScrapedData.urls),
  };
};

// Controller function to initiate scraping and respond with results
export const cheerioscrapeWebsiteController = async (req, res) => {
  const { url: baseUrl } = req.body;

  if (!baseUrl) {
    return res.status(400).json({ error: "URL is required for scraping" });
  }

  try {
    const userId = req.user.userId;  // Assuming user ID is part of authentication

    // Extract the domain from the base URL provided by the user
    const domain = extractDomain(baseUrl);

    const startTime = Date.now();

    // Scrape all pages of the website
    const mergedData = await scrapeAllPagesConcurrently(baseUrl, domain);

    // Now upload all scraped data to S3 after everything is scraped
    const s3Url = await uploadDataToS3(mergedData, userId);

    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;

    res.status(200).json({
      message: 'Scraping complete and data uploaded to S3.',
      timeTaken: `${timeTaken} seconds`,
      s3Url: s3Url,  // Return the S3 URL where the data was uploaded
    });

  } catch (error) {
    console.error('Error during scraping:', error);
    res.status(500).json({ error: 'Error during scraping process' });
  }
};

// import { cheerioCrawlWebsite, cheerioScrapeAllPages, cheerioScrapeBodyContent } from "../services/cherioService.js";

// export const cheerioscrapeWebsiteController = async (req, res) => {
//   const { url, choice } = req.body;

//   // Validation
//   if (!url) {
//     return res.status(400).json({ error: "URL is required for scraping" });
//   }

//   if (choice !== "all" && choice !== "current") {
//     return res.status(400).json({ error: 'Invalid choice. It must be "all" or "current".' });
//   }

//   try {
//     const startTime = Date.now();
//     let result;

//     if (choice === "all") {
//       // Crawl the website for all links and scrape them
//       const { links: allLinks } = await cheerioCrawlWebsite(url); // Crawl links

//       // Scrape all pages and return data directly (without S3)
//       const allPageData = await cheerioScrapeAllPages(allLinks);  // Scrape all pages
//       result = {
//         message: "Scraping completed successfully for all pages.",
//         pagesData: allPageData,  // Return the scraped data directly
//       };
//     } else {
//       // Scrape only the current page
//       const pageData = await cheerioScrapeBodyContent(url);
//       result = {
//         message: "Scraping completed successfully for the current page.",
//         pagesData: {
//           paragraphs: pageData.paragraphs,
//           links: pageData.links,
//           urls: [url],  // Return the URL of the scraped page
//         },
//       };
//     }

//     const endTime = Date.now();
//     const timeTaken = (endTime - startTime) / 1000;

//     // Return the result (scraped data) in the response
//     res.status(200).json({
//       message: result.message,
//       data: result.pagesData,  // Return the scraped content
//       timeTaken: timeTaken.toFixed(2),  // Include time taken for the scrape
//     });
//   } catch (error) {
//     console.error("Scraping error:", error);
//     res.status(500).json({ error: "Scraping failed", message: error.message });
//   }
// };
// import * as cheerio from 'cheerio';  // This will not work as Cheerio does not have a default export
// import axios from 'axios';
// import { URL } from 'url';

// const MAX_CONCURRENCY = 8;  // Number of concurrent requests
// const TIMEOUT = 5000;  // Timeout for requests in ms
// const visitedUrls = new Set();  // Set to track visited URLs
// let totalScrapedPages = 0;  // To keep track of scraped pages

// // Delay function to add a timeout between each batch of concurrent requests
// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// // Function to scrape a page's body content (paragraphs and links)
// const scrapeBodyContent = async (url) => {
//   try {
//     console.log(`Scraping page: ${url}`);  // Log the URL being scraped
//     const { data } = await axios.get(url, { timeout: TIMEOUT });
//     const $ = cheerio.load(data);

//     // Extract paragraphs and links
//     const paragraphs = new Set();
//     $('p').each((index, element) => {
//       paragraphs.add($(element).text().trim());  // Add paragraphs to the set for deduplication
//     });

//     const links = new Set();
//     $('a').each((index, element) => {
//       const href = $(element).attr('href');
//       if (href) {
//         const absoluteUrl = new URL(href, url).href;
//         links.add(absoluteUrl);  // Add links to the set for deduplication
//       }
//     });

//     return { url, paragraphs: Array.from(paragraphs), links: Array.from(links) };
//   } catch (error) {
//     console.error(`Error scraping ${url}: ${error.message}`);
//     return null;  // Return null if scraping fails
//   }
// };

// // Function to crawl the website and collect internal links
// const crawlWebsite = async (baseUrl) => {
//   try {
//     const { data } = await axios.get(baseUrl, { timeout: TIMEOUT });
//     const $ = cheerio.load(data);
//     const links = new Set();
    
//     // Find all internal links
//     $('a').each((index, element) => {
//       const href = $(element).attr('href');
//       if (href && href.startsWith(baseUrl)) {
//         const absoluteUrl = new URL(href, baseUrl).href;
//         if (!visitedUrls.has(absoluteUrl)) {
//           links.add(absoluteUrl);  // Add to the set of links to visit
//           visitedUrls.add(absoluteUrl);  // Mark as visited
//         }
//       }
//     });

//     return Array.from(links);  // Return the unique links
//   } catch (error) {
//     console.error(`Error crawling ${baseUrl}: ${error.message}`);
//     return [];  // Return empty array if crawling fails
//   }
// };

// // Function to scrape all pages concurrently with rate limiting
// const scrapeAllPagesConcurrently = async (baseUrl) => {
//   let linksToScrape = [baseUrl];  // Start with the base URL
//   visitedUrls.add(baseUrl);  // Mark the base URL as visited
//   const allScrapedData = {
//     paragraphs: new Set(),
//     links: new Set(),
//     urls: new Set(),
//   };

//   while (linksToScrape.length > 0) {
//     // Scrape up to MAX_CONCURRENCY pages concurrently
//     const currentBatch = linksToScrape.splice(0, MAX_CONCURRENCY);
//     const batchResults = await Promise.all(currentBatch.map(scrapeBodyContent));

//     // Filter out null results (failed requests)
//     const successfulResults = batchResults.filter(result => result !== null);

//     // Collect data and links from the successful results
//     successfulResults.forEach(result => {
//       totalScrapedPages++;
//       result.paragraphs.forEach(paragraph => allScrapedData.paragraphs.add(paragraph));
//       result.links.forEach(link => allScrapedData.links.add(link));
//       allScrapedData.urls.add(result.url);

//       // Add new links to scrape list
//       result.links.forEach(link => {
//         if (!visitedUrls.has(link)) {
//           visitedUrls.add(link);
//           linksToScrape.push(link);
//         }
//       });
//     });

//     // Monitor progress
//     console.log(`Scraped ${totalScrapedPages} pages so far.`);

//     // Add delay between batches to avoid overwhelming the server
//     await delay(1000);  // 1-second delay between batches
//   }

//   // Return the merged data as arrays (converting sets to arrays)
//   return {
//     paragraphs: Array.from(allScrapedData.paragraphs),
//     links: Array.from(allScrapedData.links),
//     urls: Array.from(allScrapedData.urls),
//   };
// };

// // Controller function to initiate scraping and respond with results
// export const cheerioscrapeWebsiteController = async (req, res) => {
//   const { url: baseUrl } = req.body;

//   if (!baseUrl) {
//     return res.status(400).json({ error: "URL is required for scraping" });
//   }

//   try {
//     const startTime = Date.now();

//     // Scrape all pages of the website
//     const mergedData = await scrapeAllPagesConcurrently(baseUrl);

//     const endTime = Date.now();
//     const timeTaken = (endTime - startTime) / 1000;

//     // Return the merged data along with additional info
//     res.status(200).json({
//       message: "Scraping completed successfully for all pages.",
//       data: mergedData,  // Merged paragraphs, links, and URLs
//       timeTaken: timeTaken.toFixed(2),
//       totalPages: totalScrapedPages,
//     });
//   } catch (error) {
//     console.error('Error during scraping:', error);
//     res.status(500).json({ error: "Scraping failed", message: error.message });
//   }
// };import axios from 'axios';import axios from 'axios';




// import { URL } from 'url';
// import { parse } from 'url';  // To extract the domain from the base URL
// import fs from 'fs';
// import path from 'path';  // To handle file paths
// import { promisify } from 'util';
// import { fileURLToPath } from 'url';
// import * as cheerio from 'cheerio';  // This will not work as Cheerio does not have a default export
// import axios from 'axios';

// // Get the directory name of the current module
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const MAX_CONCURRENCY = 8;  // Number of concurrent requests
// const TIMEOUT = 5000;  // Timeout for requests in ms
// const visitedUrls = new Set();  // Set to track visited URLs
// let totalScrapedPages = 0;  // To keep track of scraped pages
// const FILE_SIZE_LIMIT = 2 * 1024 * 1024;  // 2MB size limit for in-memory response (2MB in bytes)

// // Directory to save the file
// const OUTPUT_DIR = path.resolve(__dirname, 'scraped_data'); 

// // Ensure the output directory exists
// if (!fs.existsSync(OUTPUT_DIR)) {
//   fs.mkdirSync(OUTPUT_DIR);
// }

// // Delay function to add a timeout between each batch of concurrent requests
// const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// // Function to extract the domain from a given URL
// const extractDomain = (url) => {
//   const parsedUrl = parse(url);
//   return `${parsedUrl.protocol}//${parsedUrl.hostname}`;  // Return domain like 'https://startinup.up.gov.in'
// };

// // Function to scrape a page's body content (paragraphs and links)
// const scrapeBodyContent = async (url, domain) => {
//   try {
//     console.log(`Scraping page: ${url}`);  // Log the URL being scraped
//     const { data } = await axios.get(url, { timeout: TIMEOUT });
//     const $ = cheerio.load(data);

//     // Extract paragraphs and links
//     const paragraphs = new Set();
//     $('p').each((index, element) => {
//       paragraphs.add($(element).text().trim());  // Add paragraphs to the set for deduplication
//     });

//     const links = new Set();
//     $('a').each((index, element) => {
//       const href = $(element).attr('href');
//       if (href) {
//         const absoluteUrl = new URL(href, url).href;
//         links.add(absoluteUrl);  // Add links to the set for deduplication
//       }
//     });

//     return { url, paragraphs: Array.from(paragraphs), links: Array.from(links) };
//   } catch (error) {
//     console.error(`Error scraping ${url}: ${error.message}`);
//     return null;  // Return null if scraping fails
//   }
// };

// // Function to crawl the website and collect internal links
// const crawlWebsite = async (baseUrl, domain) => {
//   try {
//     const { data } = await axios.get(baseUrl, { timeout: TIMEOUT });
//     const $ = cheerio.load(data);
//     const links = new Set();

//     // Find all internal links that start with the allowed domain
//     $('a').each((index, element) => {
//       const href = $(element).attr('href');
//       if (href) {
//         const absoluteUrl = new URL(href, baseUrl).href;
//         // Only add links from the same domain
//         if (absoluteUrl.startsWith(domain) && !visitedUrls.has(absoluteUrl)) {
//           links.add(absoluteUrl);  // Add to the set of links to visit
//           visitedUrls.add(absoluteUrl);  // Mark as visited
//         }
//       }
//     });

//     return Array.from(links);  // Return the unique links
//   } catch (error) {
//     console.error(`Error crawling ${baseUrl}: ${error.message}`);
//     return [];  // Return empty array if crawling fails
//   }
// };

// // Function to scrape all pages concurrently with rate limiting
// const scrapeAllPagesConcurrently = async (baseUrl, domain) => {
//   let linksToScrape = [baseUrl];  // Start with the base URL
//   visitedUrls.add(baseUrl);  // Mark the base URL as visited
//   const allScrapedData = {
//     paragraphs: new Set(),
//     links: new Set(),
//     urls: new Set(),
//   };

//   while (linksToScrape.length > 0) {
//     // Scrape up to MAX_CONCURRENCY pages concurrently
//     const currentBatch = linksToScrape.splice(0, MAX_CONCURRENCY);
//     const batchResults = await Promise.all(currentBatch.map(url => scrapeBodyContent(url, domain)));

//     // Filter out null results (failed requests)
//     const successfulResults = batchResults.filter(result => result !== null);

//     // Collect data and links from the successful results
//     successfulResults.forEach(result => {
//       totalScrapedPages++;
//       result.paragraphs.forEach(paragraph => allScrapedData.paragraphs.add(paragraph));
//       result.links.forEach(link => allScrapedData.links.add(link));
//       allScrapedData.urls.add(result.url);

//       // Add new links to scrape list
//       result.links.forEach(link => {
//         if (!visitedUrls.has(link) && link.startsWith(domain)) {
//           visitedUrls.add(link);
//           linksToScrape.push(link);  // Only add links from the allowed domain
//         }
//       });
//     });

//     // Monitor progress
//     console.log(`Scraped ${totalScrapedPages} pages so far.`);

//     // Add delay between batches to avoid overwhelming the server
//     await delay(1000);  // 1-second delay between batches
//   }

//   // Return the merged data as arrays (converting sets to arrays)
//   return {
//     paragraphs: Array.from(allScrapedData.paragraphs),
//     links: Array.from(allScrapedData.links),
//     urls: Array.from(allScrapedData.urls),
//   };
// };

// // Function to save data to a file
// const saveDataToFile = async (data) => {
//   const filePath = path.join(OUTPUT_DIR, `scraped_data_${Date.now()}.json`);
//   const jsonData = JSON.stringify(data, null, 2);

//   // Check if the data exceeds 2MB, and save it to a file
//   const dataSize = Buffer.byteLength(jsonData, 'utf8');
//   if (dataSize > FILE_SIZE_LIMIT) {
//     await promisify(fs.writeFile)(filePath, jsonData);
//     return filePath;  // Return the path to the saved file
//   }

//   return jsonData;  // If the data is small enough, return the raw JSON
// };

// // Controller function to initiate scraping and respond with results
// export const cheerioscrapeWebsiteController = async (req, res) => {
//   const { url: baseUrl } = req.body;

//   if (!baseUrl) {
//     return res.status(400).json({ error: "URL is required for scraping" });
//   }

//   try {
//     // Extract the domain from the base URL provided by the user
//     const domain = extractDomain(baseUrl);

//     const startTime = Date.now();

//     // Scrape all pages of the website
//     const mergedData = await scrapeAllPagesConcurrently(baseUrl, domain);

//     const endTime = Date.now();
//     const timeTaken = (endTime - startTime) / 1000;

//     // Save data to a file if it exceeds 2MB
//     const savedData = await saveDataToFile(mergedData);

//     // Respond with a file path or the raw data
//     if (typeof savedData === 'string' && savedData.endsWith('.json')) {
//       res.status(200).json({
//         message: "Scraping completed successfully for all pages.",
//         downloadLink: `/download/${path.basename(savedData)}`,  // Provide a download link for the file
//         timeTaken: timeTaken.toFixed(2),
//         totalPages: totalScrapedPages,
//       });
//     } else {
//       res.status(200).json({
//         message: "Scraping completed successfully for all pages.",
//         data: savedData,  // Return raw data if it's below the 2MB limit
//         timeTaken: timeTaken.toFixed(2),
//         totalPages: totalScrapedPages,
//       });
//     }
//   } catch (error) {
//     console.error('Error during scraping:', error);
//     res.status(500).json({ error: "Scraping failed", message: error.message });
//   }
// };


