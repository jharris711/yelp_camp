/* -------------------------------------------------------------------------- */
/*                             Variables/Functions                            */
/* -------------------------------------------------------------------------- */
const express    = require('express');
const router     = express.Router({mergeParams: true});
const Campground = require("../models/campground");
const Comment    = require("../models/comments");
const middleware = require("../middleware");



/* -------------------------------------------------------------------------- */
/*                               Routes                                       */
/* -------------------------------------------------------------------------- */
//NEW - Form to create comment
router.get("/new", middleware.isLoggedIn, (req, res) => {
  Campground.findById(req.params.id, (err, campground) => {
    if (err) {
      console.log(err);
    } else {
      res.render("comments/new", {campground: campground});
    }
  });
});

//CREATE Comment:
router.post("/", middleware.isLoggedIn, (req, res) => {
//lookup campgrounds using id:
  Campground.findById(req.params.id, (err, campground) => {
    if (err) {
      console.log(err);
      res.redirect("/campgrounds");
    } else {
      Comment.create(req.body.comment, (err, comment) => {
        if (err) {
          console.log(err);
          res.redirect("/campgrounds");
        } else {
          //add UN and ID to comment:
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          //save comment:
          comment.save();
          campground.comments.push(comment);
          campground.save();
          req.flash("success", "Successfully added comment");
          res.redirect("/campgrounds/" + campground._id);
        }
      });
    }
  });
});

//EDIT comment:
router.get("/:comment_id/edit", middleware.checkCommentOwnership, (req, res) => {
  //Make sure campground exists:
  Campground.findById(req.params.id, (err, foundCampground) => {
    //If error or no campground:
    if(err || !foundCampground){
      req.flash("error", "Campground not found.");
      return res.redirect("back");
    }
    //Make sure comment exists:
    Comment.findById(req.params.comment_id, (err, foundComment) => {
      if (err) {
        res.redirect("back");
      } else {
        res.render("comments/edit", {campground_id: req.params.id, comment: foundComment});
      }
    });
  });
});

//UPDATE comment:
router.put("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, updatedComment) => {
    if (err) {
      res.redirect("back");
    } else {
      req.flash("success", "Post successfully updated.")
      res.redirect("/campgrounds/" + req.params.id);
    }
  });
});

//DELETE/DESTROY comment:
router.delete("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  Comment.findByIdAndRemove(req.params.comment_id, err => {
    if (err) {
      res.redirect("back");
    } else {
      req.flash("success", "Comment deleted.")
      res.redirect("/campgrounds/" + req.params.id);
    }
  });
});

module.exports = router;