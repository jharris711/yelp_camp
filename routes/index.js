/* -------------------------------------------------------------------------- */
/*                             Variables/Functions                            */
/* -------------------------------------------------------------------------- */
const express    = require("express");
const router     = express.Router();
const passport   = require("passport");
const User       = require("../models/user");
const Campground = require("../models/campground");
const middleware = require("../middleware");
const async      = require("async");
const nodemailer = require("nodemailer");
const crypto     = require("crypto");
//Multer config:
const multer      = require('multer');
const storage     = multer.diskStorage({
  filename: (req, file, callback) => {
    callback(null, Date.now() + file.originalname);
  }
});
const imageFilter = (req, file, cb) => {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
const upload      = multer({ storage: storage, fileFilter: imageFilter});
//Cloudinary Config:
const cloudinary  = require('cloudinary').v2;
cloudinary.config({ 
  cloud_name: 'jharris', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const escapeRegex = text => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

/* -------------------------------------------------------------------------- */
/*                                Index Routes                                */
/* -------------------------------------------------------------------------- */
//Root route:
router.get("/", (req, res) => {
    res.render("landing", {currentUser: req.user});
});

/* -------------------------------------------------------------------------- */
/*                                 Auth Routes                                */
/* -------------------------------------------------------------------------- */
// show register form
router.get("/register", (req, res) => {
  res.render("register", {page: 'register'}); 
});

//Handle Sign up logic:
router.post("/register", upload.single('image'), (req, res) => {
  cloudinary.uploader.upload(req.file.path, (err, result) => {
    if (err) {
      console.log(`ERROR: ${err}`)
    }
    // add cloudinary url for the image to the user object under image property
    req.body.image = result.secure_url;
    // add image's public_id to project object
    req.body.imageId = result.public_id;

    const newUser = new User({
      username: req.body.username, 
      firstName: req.body.firstName, 
      lastName: req.body.lastName,
      image: req.body.image,
      bio: req.body.bio,
      email: req.body.email
    });

    if(req.body.adminCode === process.env.ADMIN){
      newUser.isAdmin = true;
    }
  
    User.register(newUser, req.body.password, (err, user) => {
      if(err){
        //return register page with flash error message:
        return res.render("register", {"error": err.message});
      }
      passport.authenticate("local")(req, res, () => {
        req.flash("success", `Welcome to YelpCamp ${user.username}!`);
        res.redirect("/campgrounds");
      });
    });    
  });
});

/* -------------------------------------------------------------------------- */
/*                                Log in routes                               */
/* -------------------------------------------------------------------------- */
//show login form
router.get("/login", (req, res) => {
  res.render("login", {page: 'login'}); 
});

//Login logic
router.post("/login", passport.authenticate("local", {
  successRedirect: "/campgrounds",
  failureRedirect: "/login",
  failureFlash: true,
  successFlash: 'Welcome to YelpCamp !'
  }),(req, res) => {
});

//Logout route:
router.get("/logout", middleware.isLoggedIn, (req, res) => {
  req.logout();
  req.flash("success", `Successfully logged out.`);
  res.redirect("/campgrounds");
});


/* -------------------------------------------------------------------------- */
/*                               Forgot Password                              */
/* -------------------------------------------------------------------------- */
//Before email is sent:
router.get("/forgot", (req, res) => {
  res.render("forgot");
});

router.post("/forgot", (req, res, next) => {
  async.waterfall([
    done => {
      crypto.randomBytes(20, (err, buf) => {
        const token = buf.toString("hex");
        done(err, token);
      });
    },
    (token, done) => {
      User.findOne({ email: req.body.email }, (err, user) => {
        if (!user) {
          return res.render("forgot", {"error": "No account with that email exists."});
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; //1 Hour

        user.save(err => {
          done(err, token, user);
        });
      });
    },
    (token, user, done) => {
      const smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.GMAIL,
          pass: process.env.GMAIL_PW
        }
      });
      const mailOptions = {
        to: user.email,
        from: process.env.GMAIL,
        text: "Your are receiving this because you (or someone else) have requested the reset of the password associated with your account. "
        + "Please click on the following link, or paste it into your browser to complete the password reset process: " +
        "http://" + req.headers.host + "/reset/" + token +"\n\n" +
        "If you did not request this, please ignore this email."
      };
      smtpTransport.sendMail(mailOptions, err => {
        console.log("Mail Sent");
        req.flash("success", `An email has been sent to ${user.email} with further instructions.`);
        done(err, "done");
      });
    }
  ], err => {
    if (err) return next(err);
    res.redirect("/forgot");
  });
});

//After email is sent:
router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          console.log(err);
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      //Login to mail
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: process.env.GMAIL,
          pass: process.env.GMAIL_PW
        }
      });
      //Send mail:
      var mailOptions = {
        to: user.email,
        from: process.env.GMAIL,
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});


/* -------------------------------------------------------------------------- */
/*                                User Profile                                */
/* -------------------------------------------------------------------------- */

//User Profile:
router.get("/users/:id", (req, res) => {
  User.findById(req.params.id, (err, foundUser) => {
    if(err){
      req.flash("error", "Something went wrong...");
      res.redirect("/");
    }
    Campground.find().where("author.id").equals(foundUser._id).exec((err, campgrounds) => {
      if(err){
        req.flash("error", "Something went wrong...");
        res.redirect("/");
      }
      res.render("users/show", {user: foundUser, campgrounds: campgrounds, currentUser: req.user});
    });
  });
});


module.exports = router;

