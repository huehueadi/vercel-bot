import puppeteer from 'puppeteer'; // Import puppeteer directly
import { crawlWebsite, scrapeAllPages, scrapeBodyContent } from '../services/scrapingService.js';

export const scrapeWebsiteController = async (req, res) => {
  const { url, choice } = req.body;
  const userid = req.user.userId;  // Assuming user ID is part of authentication

  // Validation
  if (!url) {
    return res.status(400).json({ error: "URL is required for scraping" });
  }

  if (choice !== "all" && choice !== "current") {
    return res.status(400).json({ error: 'Invalid choice. It must be "all" or "current".' });
  }

  let browser;
  try {
    // Launch Puppeteer with default Chromium
    browser = await puppeteer.launch({
      headless: true,         // Ensure it's headless
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Common flags for cloud environments
      timeout: 60000,         // Timeout for browser operations
    });

    const startTime = Date.now();
    let result;

    if (choice === "all") {
      // Crawl the website for all links and scrape them
      const { links: allLinks } = await crawlWebsite(url, browser);
      const s3Url = await scrapeAllPages(browser, allLinks);
      result = {
        message: "Scraping completed successfully.",
        s3Url: s3Url,
      };
    } else {
      // Scrape only the current page
      const pageData = await scrapeBodyContent(browser, url);
      result = {
        message: "Scraping completed successfully.",
        pagesData: {
          paragraphs: pageData.paragraphs,
          links: pageData.links,
          urls: [url],
        },
      };
    }

    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;

    res.status(200).json({
      message: result.message,
      data: result.pagesData || result.s3Url,
      timeTaken: timeTaken.toFixed(2),
    });
  } catch (error) {
    console.error("Scraping error:", error);
    res.status(500).json({ error: "Scraping failed" });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
