const express = require("express");
const cors = require("cors");
require("dotenv").config();
const DB = require("./config/connectDb");
const productRouter = require("./Routers/productRouter");
const importExport = require("./Routers/importExportRouter");
const connectCloudinary = require("./config/cloudinary");
const authRouter = require("./Routers/authRouter");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api", productRouter);
app.use("/api", importExport);
app.use("/api", authRouter);

app.get("/", (req, res) => {
  res.status(200);
  res.send("Product Inventory Management system online!");
});

connectCloudinary().then(() => {
  console.log("cloudinary connected successfully!");
  app.listen(3000, () => console.log("server running on port 3000"));
});
