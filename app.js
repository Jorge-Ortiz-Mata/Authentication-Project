//jshint esversion:6

// ---------- Require packages and modules ---------------

require('dotenv').config(); // This is the package for dotenv.
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
const port = 3000;

// -------------------------------------------
// -------- Web configuration. ---------------

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(session({
    secret: "My other secret key",
    resave: false,
    saveUninitialized: false
  }));

app.use(passport.initialize());
app.use(passport.session());

// -------------------------------------------
// -------- Database configuration. ---------------

mongoose.connect("mongodb://localhost:27017/usersDB", { useNewUrlParser: true });

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String 
});

// ----------------------------------------------
// -------- Plugins configuration. ---------------

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// ----------------------------------------------
// -------- Schema configuration. ---------------

const User = new mongoose.model("User", userSchema);

// ----------------------------------------------
// -------- Sessions and cookies with Passport configuration. --------------

passport.use(User.createStrategy());
passport.serializeUser(function(user, done){
    done(null, user.id);
});
passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});

// ----------------------------------------------
// -------- Google Authentication. ---------------

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id, username: profile.id }, function(err, user) {
      return cb(err, user);    
    });
  }
));

// ----------------------------------
// -------------- GET ---------------

app.get("/", (req, res) => {
    res.render('home');
});

// --- Google authentication routes -----
app.route('/auth/google')
  .get(passport.authenticate('google', {
    scope: ['profile']
}));

app.get('/auth/google/secrets', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/secrets');
});

// --- ---------------- -----

app.get("/login", (req, res) => {
    res.render('login');
});

app.get("/register", (req, res) => {
    res.render('register');
});

app.get("/secrets", (req, res) => {
    if(req.isAuthenticated()){  // This allows to visit the webpage only if the user is authenticate.
        User.find({"secret": {$ne:null}}, function(err, usersList){ // Get only all the users with their secrets
            if(err){
                console.log(err);
                res.redirect("/login");
            } else {
                if(usersList){
                    res.render("secrets", {users: usersList});
                }
            }
        })
    }
});

app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){  // This allows to visit the webpage only if the user is authenticate.
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {  // This allows to visit the webpage only if the user is authenticate.
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

// -------------- POST ---------------

app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            })
        }
    });
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;
    User.findById(req.user.id, function(err, userFounded){ // Find the user by its ID and assign a secret.
        if(err){
            console.log(err);
        } else {
            userFounded.secret = submittedSecret;
            userFounded.save();
            res.redirect("/submit")
        }
    });
});

// -------------- PORTS ---------------

app.listen(port, () => {
    console.log("Listening on port 3000");
})
