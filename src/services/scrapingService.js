import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import ScrapedData from '../models/scrappedDataModel.js';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

export const crawlWebsite = async (url, browser, visitedUrls = new Set()) => {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors
      .map(anchor => anchor.href)
      .filter(href => href.startsWith(window.location.origin));  // Only internal links
  });

  await page.close();
  visitedUrls.add(url);

  const newLinks = links.filter(link => !visitedUrls.has(link));
  newLinks.forEach(link => visitedUrls.add(link));

  return { links: newLinks, visitedUrls };
};

export const scrapeBodyContent = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'load' });

  await page.waitForSelector('body');
  const content = await page.evaluate(() => {
    const body = document.querySelector('body');
    const paragraphs = Array.from(body.querySelectorAll('p')).map(p => p.innerText) || [];
    const links = Array.from(body.querySelectorAll('a')).map(a => a.href) || [];
    return { paragraphs, links };
  });

  await page.close();
  return content;
};

const uploadToS3 = async (data, fileName) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  };

  try {
    const s3Response = await s3.upload(params).promise();
    return s3Response.Location;
  } catch (error) {
    console.error('Error uploading to S3:', error.message);
    throw new Error('Failed to upload to S3');
  }
};


// Remove AWS S3 upload and MongoDB save, and just return scraped data

export const scrapeAllPages = async (browser, links) => {
  const allParagraphs = new Set();
  const allLinks = new Set();
  const allUrls = new Set();

  const promises = links.map(async (link) => {
    try {
      const content = await scrapeBodyContent(browser, link);

      // Store paragraphs and links from each page
      content.paragraphs.forEach(paragraph => allParagraphs.add(paragraph));
      content.links.forEach(link => allLinks.add(link));

      allUrls.add(link);
    } catch (error) {
      console.error(`Error scraping ${link}: ${error.message}`);
    }
  });

  // Wait for all scraping promises to finish
  await Promise.all(promises);

  // Convert sets to arrays for uniqueness
  const uniqueParagraphs = Array.from(allParagraphs);
  const uniqueLinks = Array.from(allLinks);
  const uniqueUrls = Array.from(allUrls);

  // Create the data object to return
  const data = {
    paragraphs: uniqueParagraphs,
    links: uniqueLinks,
    urls: uniqueUrls,
  };

  // Return the scraped data directly (no upload to S3)
  return data;
};
