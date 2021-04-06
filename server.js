/*
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./reviews');
var mongoose = require('mongoose');
var rp = require('request-promise');
const crypto = require('crypto');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

const GA_TRACKING_ID = process.env.GA_KEY;

function trackDimension(category, action, label, value, dimension, metric) {

    var options = { method: 'GET',
        url: 'https://www.google-analytics.com/collect',
        qs:
            {   // API Version.
                v: '1',
                // Tracking ID / Property ID.
                tid: GA_TRACKING_ID,
                // Random Client Identifier. Ideally, this should be a UUID that
                // is associated with particular user, device, or browser instance.
                cid: crypto.randomBytes(16).toString("hex"),
                // Event hit type.
                t: 'event',
                // Event category.
                ec: category,
                // Event action.
                ea: action,
                // Event label.
                el: label,
                // Event value.
                ev: value,
                // Custom Dimension
                cd1: dimension,
                // Custom Metric
                cm1: metric
            },
        headers:
            {  'Cache-Control': 'no-cache' } };

    return rp(options);
}

router.route('/signup')
    .post(function(req, res) {
        if (!req.body.username || !req.body.password) {
            res.json({success: false, msg: 'Please include both username and password to signup.'})
        } else {
            var user = new User();
            user.name = req.body.name;
            user.username = req.body.username;
            user.password = req.body.password;

            user.save(function (err, user) {
                if (err) {
                    return res.json({success: false, message: "A user with that username already exists"});
                }else{
                    return res.json({success: true, msg: 'Successfully created new user.', User : user});
                }
            });
        }
    })


    .all(function(req, res){
        return res.json({success: false, msg: 'This HTTP method is not supported.'});
    }
    );

router.route('/signin')
    .post(function (req, res) {
        var userNew = new User();
        userNew.username = req.body.username;
        userNew.password = req.body.password;

        User.findOne({username: userNew.username}).select('name username password').exec(function (err, user) {
            if (err) {
                res.send(err);
            }
            user.comparePassword(userNew.password, function (isMatch) {
                if (isMatch) {
                    var userToken = {id: user.id, username: user.username};
                    var token = jwt.sign(userToken, process.env.SECRET_KEY);
                    res.json({success: true, token: 'JWT ' + token});

                } else {
                    return res.status(401).send({success: false, msg: 'Authentication failed.'});
                }
            })
        })
    })

router.route('/movies/:movie_title')
    .get(authJwtController.isAuthenticated, function (req, res){
        if(req.query && req.query.reviews && req.query.reviews === "true"){

            Movie.findOne({title : req.params.movie_title}, function(err, movie) {
                if (err) {
                    return res.status(404).json({success: false, message: "Unable to find movie"});
                } else if (!movie) {
                    return res.status(403).json({success: false, message: "Movie Does Not Exist"})
                } else {
                    Movie.aggregate([
                        {
                            $match : {_id: mongoose.Types.ObjectId(movie._id)}
                        },
                        {
                            $lookup: {
                                from: "reviews",
                                localField: "_id",
                                foreignField: "movie_id",
                                as: "MovieReview"
                            }
                        },
                        {
                            $addFields: {
                                AverageReviews: {$avg: "$MovieReview.rating"}
                            }
                        }
                        
                    ]).exec(function (err, movie) {
                        if (err) {
                            return res.json(err);
                        } else {
                            return res.json({movie : movie});
                        }
                    })
                }
            })
                
            
        }else {
            Movie.find({title: req.params.movie_title}).select("title year_released genre actors").exec(function (err, movie) {
                if (err) {
                    return res.status(404).json({success: false, message: "Unable to find movie"});
                }else if (movie.length <= 0) {
                    return res.status(403).json({success: false, message: "Movie Does Not Exist"});
                }else {
                    return res.status(200).json({success: true, message: "Found Movie", Movie: movie})
                }
            })
        }
    })

router.route('/movies')
    .delete(authJwtController.isAuthenticated, function(req, res) {
        if(!req.body.title){
            res.json({success:false, message: "Provide a movie to delete"});
        }else{

            Movie.findOneAndDelete({title : req.body.title}, function(err, movie) {
                if(err){
                    return res.status(403).json({success:false, message: "Error can not delete Movie"});
                }else if(!movie){
                    return res.status(403).json({success: false, message: "Can not find Movie"});
                }else {
                    return res.status(200).json({success: true, message: "Movie Deleted"});
                }
            })
            }

    }
    )
    .put(authJwtController.isAuthenticated, function(req, res) {
        if(!req.body.title || !req.body){
            res.json({success:false, message: "Provide movie title, and items to update"});
        }else{
            var filter = {title : req.body.title};
            var update = {title : req.body};
            Movie.findOneAndUpdate({title : req.body.title}, req.body, function(err, movie) {
                if(err){
                    return res.status(403).json({success:false, message: "Can not update Movie"});
                }else if(!movie){
                    return res.status(403).json({success: false, message: "Can not find Movie"});
                }else{
                    return res.status(200).json({success: true, message:"Successfully updated"});
                }
            });
        }
    }
    )
    .get(authJwtController.isAuthenticated, function (req, res) {
        if (req.query && req.query.reviews && req.query.reviews === "true") {

            Movie.find(function (err, movies) {
                console.log(movies);
                if (err) {
                    return res.status(403).json({success: false, message: "Unable to get reviews for titles"});
                } else if (!movies) {
                    return res.status(403).json({success: false, message: "Unable to find titles"});
                } else {
                    Movie.aggregate([
                        {
                            $lookup: {
                                from: "reviews",
                                localField: "_id",
                                foreignField: "movie_id",
                                as: "MovieReview"
                            }
                        },
                        {
                            $addFields: {
                                AverageReviews: {$avg: "$MovieReview.rating"}
                            }
                        },
                        {
                            $sort: {AverageReviews : -1}
                        }
                    ]).exec(function (err, movie) {
                        if (err) {
                            return res.json(err);
                        } else {
                            return res.json({movie : movie});
                        }
                    })
                }

            })


        }else{
            Movie.find(function(err, movies){
                if(err){
                    res.send(err);
                }else{
                    return res.json(movies).status(200).end();
                }

            })
            //return res.status(403).json({success: false, message: "Unable to find movie"});
        }
    }
    )
    .post(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        if (!req.body.title || !req.body.year_released || !req.body.genre || !req.body.actors[0] || !req.body.actors[1] || !req.body.actors[2]) {
            res.json({success: false, message: "Title, Year_Released, Genre and 3 Actors are required"});
        } else {
            var movie = new Movie();

            movie.title = req.body.title;
            movie.year_released = req.body.year_released;
            movie.genre = req.body.genre;
            movie.imageUrl = req.body.imageUrl;
            movie.actors = req.body.actors;

            Movie.find({title:req.body.title}, function(err, movies){
                if(err){
                    return res.json(err);
                }else if(movies.length <= 0){
                    movie.save(function (err) {
                        if (err) {
                            return res.json(err);
                        }else{
                            res.json({success: true, msg: 'Movie Created.', Movie : movie});
                        }
                    })
                }else{
                    return res.json({success: false, message : "Movie already in database"})
                }
            })
        }
    })

    .all(function(req, res){
        return res.json({success: false, msg: "This HTTP method is not supported."});

    });

router.route('/reviews')
    .post(authJwtController.isAuthenticated, function (req, res) {
        if(!req.body.title || !req.body.comment || !req.body.rating){
            return res.json({success: false, message : "Movie Title, Username, Comment, and Rating Required"});
        }else{

            var review = new Review();

            //Retrieve the token from the authorization header
            jwt.verify(req.headers.authorization.substring(4), process.env.SECRET_KEY, function(err, usr_id){
                if(err){
                    return res.status(403).json({success : false, message:  "Can not post review."});
                }else {
                    review.user_id = usr_id.id;

                    Movie.findOne({title: req.body.title}, function(err, movie){
                        if(err) {
                            return res.status(403).json({success: false, message: "Can not Post Review"});
                        }else if(!movie){
                            return res.status(403).json({success: false, message: "Movie Does Not exist"});
                        }else{
                            review.movie_id = movie._id;
                            review.username = usr_id.username;
                            review.comment = req.body.comment;
                            review.rating = req.body.rating;

                            review.save(function (err) {
                                if (err) {
                                    return res.json(err);
                                }else{
                                    trackDimension(movie.genre, 'Rating', 'Feedback for Movie', review.rating, review.title, "1");

                                    return res.json({success: true, message: "Review Saved"});
                                }
                            })
                        }
                    })
                }
            })
        }
    })


router.all('/', function (req, res) {
    res.json({success: false, msg: 'This route is not supported.'});
})

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


