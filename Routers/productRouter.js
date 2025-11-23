const express = require("express");
const {
  addProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getInventoryHistory,
} = require("../Controllers/ProductController");
const upload = require("../Middleware/multer");
const authMiddleware = require("../Middleware/authMiddleware");

const productRouter = express.Router();

productRouter.post(
  "/product/add",
  authMiddleware,
  upload.single("image"),
  addProduct
);
productRouter.get("/product", authMiddleware, getAllProducts);
productRouter.patch("/product/:id", authMiddleware, updateProduct);
productRouter.delete("/product/delete/:id", authMiddleware, deleteProduct);
productRouter.get("/products/:id/history", authMiddleware, getInventoryHistory);
module.exports = productRouter;
