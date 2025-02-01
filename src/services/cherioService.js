import axios from 'axios';
import * as cheerio from 'cheerio';  // This will not work as Cheerio does not have a default export


export const cheerioCrawlWebsite = async (url) => {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
  
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors
        .map(anchor => anchor.href)
        .filter(href => href.startsWith(window.location.origin));  // Only internal links
    });
  
    console.log('Crawled Links:', links);  // Debug log to check the links
  
    await page.close();
  
    return { links };
  };
  
  export const scrapeBodyContent = async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load' });
  
    await page.waitForSelector('body');  // Make sure the body is fully loaded
  
    const content = await page.evaluate(() => {
      const body = document.querySelector('body');
      const paragraphs = Array.from(body.querySelectorAll('p')).map(p => p.innerText) || [];
      const links = Array.from(body.querySelectorAll('a')).map(a => a.href) || [];
      return { paragraphs, links };
    });
  
    console.log('Scraped Content:', content);  // Log to see if paragraphs and links are being extracted
  
    await page.close();
    return content;
  };
  
   // In your cherioService.js or the appropriate service file

export const cheerioScrapeAllPages = async (allLinks) => {
    const scrapedData = [];
  
    for (let link of allLinks) {
      try {
        // Here, you'd fetch the page content, parse it with Cheerio, and extract data.
        const pageData = await cheerioScrapeBodyContent(link); // This is assuming you have a function like this
  
        scrapedData.push({
          url: link,
          paragraphs: pageData.paragraphs,
          links: pageData.links
        });
  
      } catch (error) {
        console.error(`Error scraping page ${link}:`, error);
      }
    }
  
    return scrapedData; // Return the scraped data, not an S3 URL
  };
  