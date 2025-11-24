# Product Inventory Management System — Backend  
Node.js + Express + SQLite

A fully functional backend API for managing products, handling CSV import/export, Signup & Login and tracking inventory changes.  
Built as part of the Skillwise Full-Stack Assignment.

---

## 🚀 Submission Details


- **GitHub Repo:** https://github.com/nirmal-coder/product-inventory-system-backend 
- **Live Backend URL:** https://pims-backend.up.railway.app/

---

# 📦 Features

### ✔ Product Endpoints
- Fetch all products  
- Search products by name (`GET /api/products/search?name=`)  
- Update product fields via `PUT /api/products/:id`  
- Automatic stock status update based on stock count  

### ✔ CSV Import
- Endpoint: `POST /api/products/import`  
- Accepts `multipart/form-data`  
- Inserts **only new products**  
- Duplicate check by **name (case-insensitive)**  
- Returns summary:
```json
{ "added": 10, "skipped": 3, "duplicates": [{ "name": "Product A", "existingId": 2 }] }
