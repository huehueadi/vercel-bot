import puppeteer from 'puppeteer';  // Puppeteer for browser automation
import * as cheerio from 'cheerio';  // Cheerio for parsing page content
import AWS from 'aws-sdk';  // AWS SDK for S3
import { v4 as uuidv4 } from 'uuid';  // UUID for unique IDs
import ScrapedData from '../models/scrappedDataModel.js';

const MAX_CONCURRENCY = 8;  // Number of concurrent requests
const TIMEOUT = 5000;  // Timeout for requests in ms
const visitedUrls = new Set();  // Set to track visited URLs
let totalScrapedPages = 0;  // Keep track of scraped pages
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
  const parsedUrl = new URL(url);
  return `${parsedUrl.protocol}//${parsedUrl.hostname}`;  // Return domain like 'https://startinup.up.gov.in'
};

// Function to scrape a page's body content (paragraphs and links) using Puppeteer
const scrapeBodyContent = async (url, domain, browser) => {
  try {
    console.log(`Scraping page: ${url}`);  // Log the URL being scraped
    const page = await browser.newPage();
    await page.goto(url, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });

    // Get the page content using Puppeteer
    const content = await page.content();
    const $ = cheerio.load(content);

    // Extract paragraphs (text content inside <p> tags)
    const paragraphs = new Set();
    $('p').each((index, element) => {
      paragraphs.add($(element).text().trim());  // Add paragraphs to the set for deduplication
    });

    const links = new Set();
    // Extract all internal links (relative or absolute URLs)
    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        const absoluteUrl = new URL(href, url).href;
        links.add(absoluteUrl);  // Add links to the set for deduplication
      }
    });

    await page.close();  // Close the page

    return { url, paragraphs: Array.from(paragraphs), links: Array.from(links) };
  } catch (error) {
    console.error(`Error scraping ${url}: ${error.message}`);
    return null;  // Return null if scraping fails
  }
};

// Function to crawl the website and collect internal links using Puppeteer
const crawlWebsite = async (baseUrl, domain, browser) => {
  try {
    const page = await browser.newPage();
    await page.goto(baseUrl, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });

    // Get the page content using Puppeteer
    const content = await page.content();
    const $ = cheerio.load(content);
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

    await page.close();  // Close the page
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
const scrapeAllPagesConcurrently = async (baseUrl, domain, browser) => {
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
    const batchResults = await Promise.all(currentBatch.map(url => scrapeBodyContent(url, domain, browser)));

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
export const puppeteerScrapeWebsiteController = async (req, res) => {
  const { url: baseUrl } = req.body;

  if (!baseUrl) {
    return res.status(400).json({ error: "URL is required for scraping" });
  }

  try {
    const userId = req.user.userId;  // Assuming user ID is part of authentication

    // Extract the domain from the base URL provided by the user
    const domain = extractDomain(baseUrl);

    const browser = await puppeteer.launch({ headless: true });

    const startTime = Date.now();

    // Step 1: Crawl and scrape all pages
    const scrapedData = await scrapeAllPagesConcurrently(baseUrl, domain, browser);

    // Step 2: Upload scraped data to S3
    const s3Url = await uploadDataToS3(scrapedData, userId);

    const endTime = Date.now();
    const timeTaken = ((endTime - startTime) / 1000).toFixed(2);  // Convert to seconds

    await browser.close();  // Close the browser

    res.status(200).json({
      message: 'Scraping completed successfully',
      s3Url,
      timeTaken: `${timeTaken} seconds`,
      totalPagesScraped: totalScrapedPages,
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'An error occurred while scraping the website.' });
  }
};

// import puppeteer from 'puppeteer'; // Import puppeteer directly
// import { crawlWebsite, scrapeAllPages, scrapeBodyContent } from '../services/scrapingService.js';

// export const scrapeWebsiteController = async (req, res) => {
//   const { url, choice } = req.body;
//   const userid = req.user.userId;  // Assuming user ID is part of authentication

//   // Validation
//   if (!url) {
//     return res.status(400).json({ error: "URL is required for scraping" });
//   }

//   if (choice !== "all" && choice !== "current") {
//     return res.status(400).json({ error: 'Invalid choice. It must be "all" or "current".' });
//   }

//   let browser;
//   try {
//     // Launch Puppeteer with default Chromium
//     browser = await puppeteer.launch({
//       headless: true,         // Ensure it's headless
//       args: ['--no-sandbox', '--disable-setuid-sandbox'], // Common flags for cloud environments
//       timeout: 60000,         // Timeout for browser operations
//     });

//     const startTime = Date.now();
//     let result;

//     if (choice === "all") {
//       // Crawl the website for all links and scrape them
//       const { links: allLinks } = await crawlWebsite(url, browser);
//       const s3Url = await scrapeAllPages(browser, allLinks);
//       result = {
//         message: "Scraping completed successfully.",
//         s3Url: s3Url,
//       };
//     } else {
//       // Scrape only the current page
//       const pageData = await scrapeBodyContent(browser, url);
//       result = {
//         message: "Scraping completed successfully.",
//         pagesData: {
//           paragraphs: pageData.paragraphs,
//           links: pageData.links,
//           urls: [url],
//         },
//       };
//     }

//     const endTime = Date.now();
//     const timeTaken = (endTime - startTime) / 1000;

//     res.status(200).json({
//       message: result.message,
//       data: result.pagesData || result.s3Url,
//       timeTaken: timeTaken.toFixed(2),
//     });
//   } catch (error) {
//     console.error("Scraping error:", error);
//     res.status(500).json({ error: "Scraping failed" });
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// };
