const Campground = require("../models/campground");
const Comment = require("../models/comments");
//All middleware goes here:
const middlewareObj = {};

middlewareObj.isLoggedIn = (req, res, next) => {
    //Is the user logged in?
    if(req.isAuthenticated()){
        //If yes, return next action:
        return next();
    }
    //If not logged in:
    //Present Flash message:
    req.flash("error", "You need to be logged in to do that.");
    //Redirect to login:
    res.redirect("/login");
};

middlewareObj.checkCampgroundOwnership = (req, res, next) => {
    //Is the user logged in?
    if(req.isAuthenticated()){
        //Find campground by ID:
        Campground.findById(req.params.id, (err, foundCampground) => {
          //If error or if campground does not exist (foundCampground = null):  
          if(err || !foundCampground){
            //If error occurs (campground not found):
            console.log(err);
            req.flash("error", "Campground not found.");
            res.redirect("back");
          } else {
            //Does user own campground?
            if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin) {
            //If yes, execute next action:
                req.campground = foundCampground;
                next();
            } else {
              //If no:
              req.flash("error", "You don't have permission to do that.")
              res.redirect("back");
            }
          }
        });
    } else {
        //If not logged in, Flash message & redirect:
        req.flash("error", "You need to be logged in to do that.");
        res.redirect("back");
    }
};

middlewareObj.checkCommentOwnership = (req, res, next) => {
    //Is user logged in:
    if(req.isAuthenticated()){
        //If yes:
        //Find comment by comment id:
        Comment.findById(req.params.comment_id, (err, foundComment) => {
            //If error:
            if(err || !foundComment){
                req.flash("error", "Comment not found.");
                res.redirect("back");
            } else {
            //Does user own comment?
                if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "You need to be logged in to do that.");
                    res.redirect("back");
                }
            }   
        });  
    } else {
        //If not logged in, Flash message & redirect:
        req.flash("error", "You need to be logged in to do that.");
        res.redirect("back");
    }
};

middlewareObj.isAdmin = (req, res, next) => {
    if(req.user.isAdmin) {
        next();
      } else {
        req.flash('error', 'This site is now read only thanks to spam and trolls.');
        res.redirect('back');
    }
};

module.exports = middlewareObj;