/*
CSC3916 HW3
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

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
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

            user.save(function (err) {
                if (err) {
                    if (err.code == 11000)
                        return res.json({success: false, message: "A user with that username already exists"});
                    else
                        return res.json(err);
                }

                res.json({success: true, msg: 'Successfully created new user.'});
            });
        }
    })


    .all(function(req, res){
        res.json({success: false, msg: 'This HTTP method is not supported.'});
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
                    res.status(401).send({success: false, msg: 'Authentication failed.'});
                }
            })
        })
    })

router.route('/movies')
    .delete(authJwtController.isAuthenticated, function(req, res) {
        if(!req.body.title){
            res.json({success:false, message: "Provide a movie to delete"});
        }else{
            Movie.findOneAndDelete(req.body.title, function(err, movie) {
                if(err){
                    res.status(403).json({success:false, message: "Error can not delete Movie"});
                }else if(!movie){
                    res.status(403).json({success: false, message: "Can not find Movie"});
                }else {
                    res.status(200).json({success: true, message: "Movie Deleted"});
                }
            })
            }

    }
    )
    .put(authJwtController.isAuthenticated, function(req, res) {
        if(!req.body.title || !req.body.update_title){
            res.json({success:false, message: "Provide movie title to update, and new title"});
        }else{
            Movie.findOneAndUpdate(req.body.title, req.body.update_title, function(err, movie) {
                if(err){
                    res.status(403).json({success:false, message: "Can not update Movie"});
                }else if(!movie){
                    res.status(403).json({success: false, message: "Can not find Movie"});
                }else{
                    res.status(200).json({success: true, message:"Successfully updated title"});
                }
            });
        }
    }
    )
    .get(authJwtController.isAuthenticated, function (req, res) {
        if (!req.body){
            res.json({success:false, message: "Provide a movie to display"});
        }else{
            Movie.find(req.body).select("title year_released genre actors").exec(function(err, movie) {
                if (err) {
                    res.status(403).json({success: false, message: "Unable to find movie"});
                }
                if (movie) {
                    res.status(200).json({success: true, message: "Found Movie", Movie: movie})
                } else {
                    res.status(404).json({success: false, message: "Movie not found"});

                }
            })
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
            movie.actors = req.body.actors;

            movie.save(function (err) {
                if (err) {
                    if (err.code == 11000)
                        return res.json({success: false, message: "A user with that username already exists"});
                    else
                        return res.json(err);
                }
            })
            res.json({success: true, msg: 'Movie Created.'});

        }
    })

    .all(function(req, res){
        res.json({success: false, msg: "This HTTP method is not supported."});

    });

router.all('/', function (req, res) {
    res.json({success: false, msg: 'This route is not supported.'});
})

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


