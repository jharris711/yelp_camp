/* -------------------------------------------------------------------------- */
/*                             Variables/Functions                            */
/* -------------------------------------------------------------------------- */
const express           = require('express');
const app               = express();
const bodyParser        = require("body-parser");
const mongoose          = require("mongoose");
const flash             = require("connect-flash");
const passport          = require("passport");
const cookieParser      = require("cookie-parser");
const LocalStrategy     = require("passport-local");
const methodOverride    = require("method-override");
const port              = process.env.PORT || 80;
//const port              = 3000;
const dotenv            = require("dotenv").config();
//Model variables
const Campground        = require("./models/campground");
const Comment           = require("./models/comments");
const User              = require("./models/user");
const session           = require("express-session");
//Seed database variable:
const seedDB            = require("./seeds");
//Route Variables:
const commentRoutes     = require("./routes/comments");
const campgroundRoutes  = require("./routes/campgrounds");
const indexRoutes       = require("./routes/index");

/* -------------------------------------------------------------------------- */
/*                                    Setup                                   */
/* -------------------------------------------------------------------------- */
//Mongoose:
mongoose.connect(process.env.MONGODB_URI,
  {
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
      useUnifiedTopology: true
  }).then(() => {
      console.log("Connected to the DB!");
  }).catch(err => {
      console.log(`DB failed to connect. Here's the error: ${err.message}`)
  });


app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(cookieParser('secret'));
//require moment.js:
app.locals.moment = require('moment');

//Seed the database:
//seedDB();

/* -------------------------------------------------------------------------- */
/*                               Passport Config                              */
/* -------------------------------------------------------------------------- */
app.use(require("express-session")({
  secret: process.env.EXPRESS_SECRET,
  resave: false,
  saveUninitialized: false
}));


app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

/* -------------------------------------------------------------------------- */
/*                                  Listener                                  */
/* -------------------------------------------------------------------------- */
app.listen(port, () => {
    console.log(`Yelp Camp Server Started On Port ${port}`);
});