/* -------------------------------------------------------------------------- */
/*                             Variables/Functions                            */
/* -------------------------------------------------------------------------- */
const express     = require('express');
const router      = express.Router();
const Campground  = require("../models/campground");
const Comment     = require("../models/comments");
const User        = require("../models/user");
const middleware  = require("../middleware");
const dotenv      = require("dotenv").config();
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
/*                              Campground Routes                             */
/* -------------------------------------------------------------------------- */
//Root route:
//INDEX - show all campgrounds
router.get("/", (req, res) => {
  if (req.query.search && req.xhr) {
    const regex = new RegExp(escapeRegex(req.query.search), "gi");
    // Get all campgrounds from DB
    Campground.find({name: regex}, (err, allCampgrounds) => {
      if(err){
        console.log(err);
      } else {
        res.status(200).json(allCampgrounds);
      }
    });
  } else {
    // Get all campgrounds from DB
    Campground.find({}, (err, allCampgrounds) => {
      if(err){
        console.log(err);
      } else {
        if(req.xhr) {
          res.json(allCampgrounds);
        } else {
          res.render("campgrounds/index",{campgrounds: allCampgrounds, page: 'campgrounds', currentUser: req.user});
        }
      }
    });
  }
});

//CREATE - New campground post route:
router.post("/", middleware.isLoggedIn, upload.single('image'), (req, res) => {
  cloudinary.uploader.upload(req.file.path, (err,result) => {
    if(err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    // add cloudinary url for the image to the campground object under image property
    req.body.campground.image = result.secure_url;
    // add image's public_id to campground object
    req.body.campground.imageId = result.public_id;
    // add author to campground
    req.body.campground.author = {
      id: req.user._id,
      username: req.user.username
    }
    Campground.create(req.body.campground, (err, campground) => {
      if (err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      res.redirect(`/campgrounds/${campground.id}`);
    });
  });
});

//NEW - Add new campground form:
router.get("/new", middleware.isLoggedIn, (req, res) => {
    res.render("campgrounds/new", {currentUser: req.user});
});

//SHOW - shows more info about one campground
router.get("/:id", (req, res) => {
  //Find the campground with provided ID
  Campground.findById(req.params.id).populate("comments").exec((err, foundCampground) => {
    //if error or campground does not exist (foundCampground = null):
    if (err || !foundCampground) {
      //Redirect to campground show page:
      req.flash("error", "That campground does not exist.")
      return res.redirect("back");
    } else {
      //Render show template with that campground
      res.render("campgrounds/show", {campground: foundCampground, currentUser: req.user});
    }
  });
});

//EDIT campground route:
router.get("/:id/edit", middleware.checkCampgroundOwnership, (req, res) => {
  Campground.findById(req.params.id, (err, foundCampground) => {
    res.render("campgrounds/edit", {campground: foundCampground});
  });
});

//UPDATE campground route:
router.put("/:id", upload.single('image'), (req, res) => {
  Campground.findByIdAndUpdate(req.params.id, req.body.campground, async (err, campground) => {
      if(err){
          req.flash("error", err.message);
          res.redirect("back");
      } else {
          if (req.file) {
            try {
                await cloudinary.uploader.destroy(campground.imageId);
                const result = await cloudinary.uploader.upload(req.file.path);
                campground.imageId = result.public_id;
                campground.image = result.secure_url;
            } catch(err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
          }
          req.flash("success","Successfully Updated!");
          res.redirect("/campgrounds/" + campground._id);
      }
  });
});

//DESTROY campground route:
router.delete('/:id', function(req, res) {
  Campground.findById(req.params.id, async function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
        await cloudinary.v2.uploader.destroy(campground.imageId);
        campground.remove();
        req.flash('success', 'Campground deleted successfully!');
        res.redirect('/campgrounds');
    } catch(err) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
    }
  });
});

module.exports = router;