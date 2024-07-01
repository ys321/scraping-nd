const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const fs = require('fs-extra');

const getUrlsFromDatabase = async () => {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'findbull'
    });

    const [rows, fields] = await conn.execute("SELECT id, link, product_name, dealer FROM wp_metal_price WHERE dealer LIKE '%Bullion Exchanges%' LIMIT 10");

    await conn.end();
    return rows.map(row => row.link);
};

const scrapeMonumentMetals = async (url) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Increased timeout and wait for the network to be idle
        await page.waitForSelector('body main .priceBox-sLWf .list-qaL5 .blockRight-WXK5', { timeout: 60000 }); // Increased timeout

        const tableData = await page.evaluate(() => {
            const rows = document.querySelectorAll('.list-qaL5 > .grid-JMDT.body-Pez9');
            const data = Array.from(rows).map(row => {
                const columns = row.querySelectorAll('div');
                const quantity = columns[0].textContent.trim();
                const priceWireCheck = columns[1].textContent.trim();
                const priceCrypto = columns[2].textContent.trim();
                const priceCardPayPal = columns[3].textContent.trim();

                return {
                    quantity,
                    priceWireCheck,
                    priceCrypto,
                    priceCardPayPal
                };
            });
            return data;
        });

        await browser.close();
        return tableData;
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        await browser.close();
        return null; // Return null in case of an error
    }
};

const bullionexchanges = async () => {
    try {
        console.log('Starting to fetch URLs...');
        const urls = await getUrlsFromDatabase();
        console.log('URLs fetched:', urls);

        const results = []; // Array to store all data

        for (const url of urls) {
            console.log(`Fetching data from ${url}...`);
            const data = await scrapeMonumentMetals(url);
            if (data) { // Only push data if it was successfully scraped
                console.log(`Data from ${url}:`, data);
                results.push({ url, data });
            } else {
                console.log(`Failed to scrape data from ${url}`);
            }
        }

        // Check the collected data before writing to the file
        console.log('Collected results:', results);

        // Write results to a JSON file
        console.log('Writing results to monumentMetalsData.json...');
        await fs.writeJson('bullionexchangesData.json', results, { spaces: 2 });
        console.log('Data has been saved to monumentMetalsData.json');
    } catch (error) {
        console.error('Error:', error);
    }
};

// Call the function to execute it
bullionexchanges();

module.exports = bullionexchanges;
