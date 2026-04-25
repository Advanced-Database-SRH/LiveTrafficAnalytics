import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import { createClient } from "redis";
import { QdrantClient } from "@qdrant/js-client-rest";
// const express = require("express");
// const mongoose = require("mongoose");
// const { createClient } = require("redis");
// const { QdrantClient } = require("@qdrant/js-client-rest");

//const { startRedisConsumer } = require('./src/services/redisConsumer');
import { startRedisConsumer } from "./src/services/redisConsumer.js";
import trafficRoutes from "./src/routes/trafficRoute.js";
// const trafficRoutes = require("./src/routes/trafficRoute");

const app = express();
app.use(express.json());

const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379'
 });
redisClient.on("error", (err) => console.error("Redis Client Error:", err));

const qdrantClient = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });

app.use("/api/traffic", trafficRoutes);

async function startServer() {
  try {
    console.log("Starting database connections...");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");

    await redisClient.connect();
    console.log("Redis connected successfully");

    await qdrantClient.getCollections();
    console.log("Qdrant connected successfully");

    startRedisConsumer(redisClient);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
