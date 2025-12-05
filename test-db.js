const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

console.log("Attempting to connect to MongoDB...");
// Hide password in logs
console.log("URI:", uri ? uri.replace(/:([^:@]+)@/, ':****@') : 'undefined');

mongoose.connect(uri)
    .then(() => {
        console.log("SUCCESS: Connected to MongoDB!");
        process.exit(0);
    })
    .catch(err => {
        console.error("ERROR: Connection failed.");
        console.error("Name:", err.name);
        console.error("Message:", err.message);
        if (err.cause) console.error("Cause:", err.cause);
        process.exit(1);
    });
