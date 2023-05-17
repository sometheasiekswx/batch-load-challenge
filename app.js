const {MongoClient, ServerApiVersion} = require("mongodb");
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');

require("dotenv").config();

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING, {
    serverApi: {
        version: ServerApiVersion.v1, strict: true, deprecationErrors: true,
    }
});

const orderCSVUrl = 'https://drive.google.com/uc?id=1MzkoUhjhd4wNgrQ84jZ-FF4GZCk6FBTd';
const stockCSVUrl = 'https://drive.google.com/uc?id=16KlCwz-q51VZnQ7xyOTvZwEpCNrKuPEr';

const csvFilePath = 'data.csv';

async function downloadCSVFromUrl(url, filePath) {
    try {
        const response = await axios.get(url, {responseType: 'stream'});
        const stream = response.data.pipe(fs.createWriteStream(filePath));

        return new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    } catch (error) {
        throw new Error(`Error downloading CSV: ${error.message}`);
    }
}

async function readCSVFromFile(filePath) {
    try {
        const results = [];
        const stream = fs.createReadStream(filePath);

        return new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (row) => {
                    results.push(row);
                })
                .on('end', () => {
                    resolve(results);
                })
                .on('error', (error) => {
                    reject(new Error(`Error parsing CSV: ${error.message}`));
                });
        });
    } catch (error) {
        throw new Error(`Error reading CSV: ${error.message}`);
    }
}

async function processCSVFromUrl(url) {
    try {
        await downloadCSVFromUrl(url, csvFilePath);
        return await readCSVFromFile(csvFilePath);
    } catch (error) {
        console.error(error.message);
        return null;
    }
}


async function run() {
    try {
        const database = client.db("batch-load-challenge-db");
        const stock = database.collection("stock");

        const parsedStock = await processCSVFromUrl(stockCSVUrl);
        if (parsedStock) {
            const result = await stock.insertMany(parsedStock);
            console.log(`${JSON.stringify(result)} ${JSON.stringify(stock)} inserted`)
        }

        const parsedData = await processCSVFromUrl(orderCSVUrl);
        if (parsedData) {
            const orders = database.collection("orders");
            const customers = database.collection("customers");

            for (const record of parsedData) {
                const customer = await customers.findOne({customerId: record.customerId});
                if (!customer) {
                    console.log(`customer does not exist`);
                    continue;
                }

                const order = await orders.findOne({customerId: record.customerId, orderId: record.orderId});
                if (order) {
                    console.log(`order already exists`);
                    continue;
                }

                const stockLeft = await stock.findOne({item: record.item});
                if (stockLeft.quantity <= 0) {
                    console.log(`item out of stock`);
                    continue;
                }

                if (stockLeft.quantity - record.quantity < 0) {
                    console.log(`You ordered ${record.quantity}, but item only has ${stockLeft.quantity} left on stock`);
                    continue;
                }

                const result = await orders.insertOne(record);
                console.log(`${JSON.stringify(result)} ${JSON.stringify(record)} inserted`);
            }

        } else {
            console.log('Failed to parse CSV data');
        }
    } finally {
        await client.close();
    }
}

run().catch(console.dir);

