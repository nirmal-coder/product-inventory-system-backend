const fs = require("fs");
const csv = require("csv-parser");
const DB = require("../config/connectDb");

const importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    const results = [];
    const duplicates = [];
    let added = 0;
    let skipped = 0;

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", async () => {
        for (let row of results) {
          const { name, unit, category, brand, stock, imageUrl, status } = row;

          if (!name) {
            skipped++;
            continue;
          }

          // Check duplicate (case insensitive)
          const existing = await DB.getAsync(
            `SELECT id FROM products WHERE LOWER(name) = LOWER(?)`,
            [name.trim()]
          );

          if (existing) {
            duplicates.push({ name, existingId: existing.id });
            skipped++;
            continue;
          }

          // Insert new product
          const insertQuery = `
            INSERT INTO products
              (name, unit, category, brand, stock, imageUrl , status)
            VALUES (?, ?, ?, ?, ?, ? , ?)
          `;

          const insertResult = await DB.runAsync(insertQuery, [
            name,
            unit,
            category,
            brand,
            stock,
            imageUrl,
            status,
          ]);

          const productId = insertResult.lastID;

          // 🔥 Insert inventory history (matching schema)
          await DB.runAsync(
            `INSERT INTO inventory_history 
      (product_id, old_quantity, new_quantity, change_date, user_info)
   VALUES (?, ?, ?, datetime('now'), ?)`,
            [productId, 0, Number(stock), "CSV Import"]
          );

          added++;
        }

        fs.unlinkSync(req.file.path); // delete uploaded file after reading

        res.json({
          success: true,
          message: "Import completed",
          added,
          skipped,
          duplicates,
        });
      });
  } catch (error) {
    console.log("CSV Import Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to import CSV",
    });
  }
};

const exportProducts = async (req, res) => {
  try {
    const products = await DB.allAsync(
      `SELECT * FROM products ORDER BY id DESC`
    );

    if (products.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No products found" });
    }

    let csvData = "id,name,unit,category,brand,stock,status,imageUrl\n";

    products.forEach((p) => {
      csvData += `${p.id},${p.name},${p.unit},${p.category},${p.brand},${p.stock},${p.status},${p.imageUrl}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=products_export.csv"
    );

    res.send(csvData);
  } catch (error) {
    console.log("CSV Export Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export CSV",
    });
  }
};

module.exports = {
  importProducts,
  exportProducts,
};
