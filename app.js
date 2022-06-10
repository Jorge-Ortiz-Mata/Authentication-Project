//jshint esversion:6

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const app = express();
const port = 3000;

mongoose.connect("mongodb://localhost:27017/usersDB", { useNewUrlParser: true });

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const secret = "ThisIsOurLittleSecretKey";
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

// -------------- GET ---------------

app.get("/", (req, res) => {
    res.render('home');
});

app.get("/login", (req, res) => {
    res.render('login');
});

app.get("/register", (req, res) => {
    res.render('register');
});

// -------------- POST ---------------

app.post("/register", (req, res) => {
    const user = new User ({
        email: req.body.username,
        password: req.body.password
    });
    user.save(function(err){
        if(err){
            console.log(err);
        } else {
            res.render('secrets');
        }
    });
});

app.post("/login", (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    User.findOne({email: email}, function(err, userFounded){
        if(err){
            console.log(err);
        } else {
            if(userFounded.password === password){
                res.render('secrets');
            } else {
                res.redirect("/login");
            }
        }
    });
});

// -------------- PORTS ---------------

app.listen(port, () => {
    console.log("Listening on port 3000");
})
