const express = require("express");
const {
  importProducts,
  exportProducts,
} = require("../Controllers/csvImportAndExport");
const upload = require("../Middleware/multer");
const authMiddleware = require("../Middleware/authMiddleware");

const router = express.Router();

router.post(
  "/products/import",
  authMiddleware,
  upload.single("file"), // file field name
  importProducts
);

router.get("/products/export", authMiddleware, exportProducts);

module.exports = router;
