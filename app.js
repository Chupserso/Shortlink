const express = require("express");
const config = require("config");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const mysql = require("mysql");

const app = express();
const jsonParser = bodyParser.json();

const conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "shortlink",
    password: "root"
})
conn.connect(error => {
    if (error) {
        console.log("Error connecting to database");
        return false;
    } else {
        console.log("Database connection established");
    }
});

app.post("/auth/register", jsonParser, async (req, res) => {
    const {email, password} = req.body;
    const hashPassword = await bcrypt.hash(password, 8);
    if (password.length < 8) {
        return res.status(400).json({status: "error", message: "Password less than 8 characters"});
    }
    if (!email.includes("@")) {
        return res.status(400).json({status: "error", message: "Invalid email"});
    }
    let checkEmailQuery = `SELECT * FROM users WHERE email="${email}"`;
    await conn.query(checkEmailQuery, (error, result, field) => {
        if (result.length != 0) {
            return res.status(500).json({status: "error", message: "User with this email exists"});
        } else {
            const createUserQuery = `INSERT INTO users (email, password) VALUES ("${email}", "${hashPassword}")`;
            conn.query(createUserQuery, (error, result, field) => {
                if (error != null) {
                    return res.status(500).json({status: "error", message: "Database error..."})
                }
                return res.status(200).json({status: "ok", message: "User created"});
            });        
        }
    });
});
app.post("/auth/login", jsonParser, async (req, res) => {
    const {email, password} = req.body;
    let formError;
    if (password.length < 8) {
        return res.status(400).json({status: "error", message: "Password less than 8 characters"});
    }
    if (!email.includes("@")) {
        return res.status(400).json({status: "error", message: "Invalid email"});
    }
    const checkUserQuery = `SELECT * FROM users WHERE email="${email}"`;
    conn.query(checkUserQuery, (error, result, fields) => {
        const comparePasswords = bcrypt.compareSync(password, result[0].password);
        if (!comparePasswords) {
            return res.status(400).json({status: "error", message: "Incorrect email or password"});
        }
        res.status(200).json({status: "ok", message: "You are logged in"});
    })
});
app.post("/auth/urls/get", jsonParser, async (req, res) => {
    const {email} = req.body;
    if (email == "") {
        return res.status(400).json({status: "error", message: "Invalid email"});
    } else {
        const linksQuery = `SELECT * FROM links WHERE email='${email}'`;
        conn.query(linksQuery, (error, result, fields) => {
            const data = result;
            res.status(200).json({status: "ok", data});
        })
    }
});
app.post("/auth/urls/send", jsonParser, async (req, res) => {
    const longLink = req.body.link;
    const email = req.body.email;
    if (longLink.length <= 9) {
        return res.status(400).json({status: "error", message: "Invalid url"})
    } else {
        let uniqueCode = "";
        const chars = "qwertyuiopasdfghjklzxcvbnm";
        for (let i = 0; i < 4; i++) {
            uniqueCode += chars[Math.floor(Math.random() * chars.length)];
        }
        const shortLink = "/" + uniqueCode;
        const query = `INSERT INTO links (longLink, shortLink, email) VALUES ('${longLink}', '${shortLink}', '${email}')`;
        await conn.query(query, (error, result, field) => {
            console.log(error);
            if (error != null) {
                return res.status(500).json({status: "error", message: "Database error..."})
            }
            return res.status(200).json({status: "ok", message: "You have successfully shortened the link"});
        });
    }
});

const PORT = process.env.PORT || config.get("port");
app.listen(PORT, (error) => {
    if (error) {
        console.log("Error in server setup")
    }
    console.log(`Server has been started on ${PORT} port...`);
});