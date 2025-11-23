const DB = require("../config/connectDb");

const cloudinary = require("cloudinary").v2;

const addProduct = async (req, res) => {
  try {
    const { name, unit, category, brand, stock } = req.body;
    const image = req.file;

    if (!name || !unit || !category || !brand || !stock) {
      throw new Error("All fields are required!");
    }

    if (!image) {
      throw new Error("Image is required");
    }

    // Check if product name already exists (case-insensitive)
    const existingProduct = await DB.getAsync(
      `SELECT * FROM products WHERE LOWER(name) = LOWER(?)`,
      [name]
    );

    if (existingProduct) {
      throw new Error("Product name already exists! Try a different name.");
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(image.path, {
      resource_type: "image",
    });

    const imageUrl = result.secure_url;
    const imagePublicId = result.public_id;

    // INSERT using prepared statement (best practice)
    const addProductQuery = `
      INSERT INTO products 
      (name, unit, category, brand, stock, imageUrl, image_public_id , status )
      VALUES (?, ?, ?, ?, ?, ?, ? , ?)
    `;
    let status = Number(stock) > 0 ? "In Stock" : "Out of Stock";
    const addToDb = await DB.runAsync(addProductQuery, [
      name,
      unit,
      category,
      brand,
      stock,
      imageUrl,
      imagePublicId,
      status,
    ]);

    console.log("addToDb => ", addToDb);

    const productId = addToDb.lastID;

    // 🔥 Insert inventory log for first creation
    await DB.runAsync(
      `INSERT INTO inventory_history (product_id, old_quantity, new_quantity, change_date, user_info)
   VALUES (?, ?, ?, datetime('now'), ?)`,
      [productId, 0, Number(stock), "admin"]
    );

    const newProduct = await DB.getAsync(
      `SELECT * FROM products WHERE id = ?`,
      addToDb.lastID
    );

    res.json({
      success: true,
      message: "Product Added Successfully!",
      data: newProduct,
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: error.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", category = "" } = req.query;

    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;

    // Base query + dynamic filters
    let baseQuery = `FROM products WHERE 1 = 1`;
    const params = [];

    // Search by name
    if (search) {
      baseQuery += ` AND name LIKE ?`;
      params.push(`%${search}%`);
    }

    // Filter by category
    if (category) {
      baseQuery += ` AND category = ?`;
      params.push(category);
    }

    // Total count (for pagination)
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await DB.getAsync(countQuery, params);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Fetch paginated data
    const dataQuery = `
      SELECT * 
      ${baseQuery}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const finalParams = [...params, limit, offset];
    const products = await DB.allAsync(dataQuery, finalParams);

    res.json({
      success: true,
      message: "Products fetched successfully",
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      data: products,
    });
  } catch (error) {
    console.log("Get Products Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch products",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // --- Fetch existing product ---
    const existing = await DB.getAsync(
      "SELECT * FROM products WHERE id = ?",
      productId
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // --- Gather incoming fields ---
    const { name, brand, category, unit, stock } = req.body;

    // Build an update map only for changed fields
    const updates = {};
    const values = [];

    if (name && name !== existing.name) updates.name = name;
    if (brand && brand !== existing.brand) updates.brand = brand;
    if (category && category !== existing.category) updates.category = category;
    if (unit && unit !== existing.unit) updates.unit = unit;
    if (stock && stock !== existing.stock) updates.stock = Number(stock); // ensure integer

    // ----------- IF NOTHING CHANGED -----------
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No changes detected",
      });
    }

    // ----------- BUILD SQL QUERY -----------
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");

    const sql = `UPDATE products SET ${fields} WHERE id = ?`;

    for (const key in updates) {
      values.push(updates[key]);
    }
    values.push(productId);

    await DB.runAsync(sql, values);

    const oldStock = existing.stock;
    const newStock = Number(stock);

    const date = new Date().toISOString();
    if (oldStock !== newStock) {
      await DB.runAsync(
        `INSERT INTO inventory_history (product_id, old_quantity, new_quantity, change_date, user_info)
   VALUES (?, ?, ?, ?, ?)`,
        [productId, oldStock, newStock, date, "admin"]
      );
    }

    // Fetch updated product
    const updatedProduct = await DB.getAsync(
      "SELECT * FROM products WHERE id = ?",
      productId
    );

    res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.log("Update error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update product",
    });
  }
};

// DELETE a product by ID
// DELETE a product by ID
const deleteProduct = async (req, res) => {
  const { id } = req.params;

  // 1. Validate ID (must be a number)
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing ID",
    });
  }

  // 2. Check whether record exists before deleting
  const checkQuery = "SELECT * FROM products WHERE id = ?";
  DB.get(checkQuery, [id], (checkErr, product) => {
    if (checkErr) {
      return res.status(500).json({
        success: false,
        message: "Database error while checking product",
        error: checkErr.message,
      });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 3. Delete the record
    const deleteQuery = "DELETE FROM products WHERE id = ?";
    DB.run(deleteQuery, [id], function (deleteErr) {
      if (deleteErr) {
        return res.status(500).json({
          success: false,
          message: "Error deleting product",
          error: deleteErr.message,
        });
      }

      // 4. If `this.changes` = 0, nothing was deleted
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found or already deleted",
        });
      }

      // 5. Successful deletion
      return res.status(200).json({
        success: true,
        message: "Product deleted successfully",
        deletedId: id,
      });
    });
  });
};

const getInventoryHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await DB.allAsync(
      `SELECT * FROM inventory_history
       WHERE product_id = ?
       ORDER BY change_date DESC`,
      [id]
    );

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.log("History Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory history",
    });
  }
};

module.exports = {
  addProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getInventoryHistory,
};
