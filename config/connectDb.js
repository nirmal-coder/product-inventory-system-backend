const sqlite = require("sqlite3").verbose();
const util = require("util");

const DB = new sqlite.Database(
  "./inventory.db",
  sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE,
  (err) => {
    if (err) {
      console.log(err.message);
      return;
    }
    console.log("Connected to Database succussfully!");
  }
);

DB.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    DB.run(sql, params, function (err) {
      if (err) reject(err);
      resolve({
        lastID: this.lastID,
        changes: this.changes,
      });
    });
  });
};

DB.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    DB.get(sql, params, function (err, row) {
      if (err) reject(err);
      resolve(row);
    });
  });
};

DB.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    DB.all(sql, params, function (err, rows) {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

const createProductQuery = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  stock INTEGER NOT NULL,
  imageUrl TEXT,
  image_public_id TEXT,
  status TEXT
);`;

const createInventoryQuery = `CREATE TABLE IF NOT EXISTS inventory_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    old_quantity INTEGER,
    new_quantity INTEGER,
    change_date TEXT,
    user_info TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`;

const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  )
`;

DB.serialize(() => {
  DB.run(createProductQuery, [], (err) => {
    if (err) {
      console.log(err.message);
    }
    console.log("Created product Table!");
  });
  DB.run(createInventoryQuery, [], (err) => {
    if (err) {
      console.log(err.message);
    }
    console.log("Created Inventory Table!");
  });
  DB.run(createUsersTable, [], (err) => {
    if (err) {
      console.log(err.message);
    }
    console.log("Created User Table!");
  });
});

module.exports = DB;
