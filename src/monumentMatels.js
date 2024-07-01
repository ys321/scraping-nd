const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');

const getUrlsFromDatabase = async () => {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'findbull'
    });

    const [rows, fields] = await conn.execute("SELECT id, link, product_name, dealer FROM wp_metal_price WHERE dealer LIKE '%Monument Metals%' LIMIT 10");

    await conn.end();
    return rows.map(row => row.link);
};

const scrapeMonumentMetals = async (url) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForSelector(".priceBlock-table-16C");

    const tableData = await page.evaluate(() => {
        const table = document.querySelector(".priceBlock-table-16C");
        const headers = table.querySelectorAll("thead th");
        const rows = table.querySelectorAll("tbody tr");

        const headerData = [];
        headers.forEach(header => {
            headerData.push(header.innerText.trim());
        });

        const rowData = [];
        rows.forEach(row => {
            const cols = row.querySelectorAll("td");
            const rowContent = {};
            cols.forEach((col, index) => {
                rowContent[headerData[index]] = col.innerText.trim();
            });
            if (Object.keys(rowContent).length) {
                rowData.push(rowContent);
            }
        });
        return rowData;
    });

    await browser.close();
    return tableData;
};

const fs = require('fs-extra');

const monumentMatels = async () => {
    try {
        console.log('Starting to fetch URLs...');
        const urls = await getUrlsFromDatabase();
        console.log('URLs fetched:', urls);

        const results = [];

        for (const url of urls) {
            console.log(`Fetching data from ${url}...`);
            const data = await scrapeMonumentMetals(url);
            console.log(`Data from ${url}:`, data);
            results.push({ url, data });
        }

        console.log('Collected results:', results);

        // Write results to a JSON file
        console.log('Writing results to monumentMetalsData.json...');
        await fs.writeJson('monumentMetalsData.json', results, { spaces: 2 });
        console.log('Data has been saved to monumentMetalsData.json');
    } catch (error) {
        console.error('Error:', error);
    }
};

monumentMatels();

module.exports = monumentMatels;
