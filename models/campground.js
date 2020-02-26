const mongoose = require("mongoose");

/* -------------------------------------------------------------------------- */
/*                     Campground Schema and Model Export                     */
/* -------------------------------------------------------------------------- */

var campgroundSchema = new mongoose.Schema({
    name: String,
    price: String,
    image: String,
    imageId: String,
    location: String,
    description: String,
    createdAt: { type: Date, default: Date.now },
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
        }
    ]
});
  
module.exports = mongoose.model("Campground", campgroundSchema);