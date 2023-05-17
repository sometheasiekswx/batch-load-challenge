const {MongoClient, ServerApiVersion} = require('mongodb');
const axios = require('axios');
const csv = require('csv-parser');

require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING, {
    serverApi: {
        version: ServerApiVersion.v1, strict: true, deprecationErrors: true,
    },
});

const csvUrl = 'https://drive.google.com/uc?id=1MzkoUhjhd4wNgrQ84jZ-FF4GZCk6FBTd';

async function importCSVToDatabase(url) {
    try {
        const response = await axios.get(url, {responseType: 'stream'});

        return new Promise((resolve, reject) => {
            response.data
                .pipe(csv())
                .on('data', async (row) => {
                    // Process each row of the CSV
                    if (row) {
                        const database = client.db('batch-load-challenge-db');
                        const orders = database.collection('orders');
                        const customers = database.collection('customers');

                        const customer = await customers.findOne({
                            customerId: row.customerId,
                        });
                        if (customer) {
                            const order = await orders.findOne({
                                customerId: row.customerId, orderId: row.orderId,
                            });
                            if (!order) {
                                const result = await orders.insertOne(row);
                                console.log(`${result} inserted`);
                                console.log(row);
                            } else {
                                console.log(`Order already exists`);
                            }
                        }
                    }
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', (error) => {
                    reject(new Error(`Error parsing CSV: ${error.message}`));
                });
        });
    } catch (error) {
        throw new Error(`Error downloading CSV: ${error.message}`);
    }
}

async function run() {
    try {
        await importCSVToDatabase(csvUrl);
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
