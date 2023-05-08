# Batch Load Challenge

This batch job is designed to retrieve a CSV file from a Google Drive URL, download it, parse its contents, and import orders into a MongoDB database. 

It ensures that the customerId exists in the database before importing the order. The job is implemented in Node.js using libraries such as axios, fs, csv-parser, and the MongoDB driver (mongodb).

## Prerequisites

- Node.js (v12 or higher)
- MongoDB database

## Configuration

- Create a .env file in the project directory.
- Following the template of the .env.example file, add the required variables

## Install & Run

- Install the dependencies by running the following command:

    ```
    npm install
    ```
- Run the following command to start the batch job:

    ```
    node app.js
    ```
  
- Will download the CSV file from the Google Drive URL, parse its contents, and import the orders into the MongoDB database.
- The console will display the progress and status of each successful order import.
