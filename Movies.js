var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

try {
    mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify : false}, () =>
        console.log("connected"));
}catch(error){
    console.log("could not connect");
}
mongoose.set('useCreateIndex', true);

//Movies Schema
var MovieSchema = new Schema({
    title: {
        type: String,
        trim: true,
        required: "Title is required",

    },
    year_released: {
        type: Number,
        required: "Year Released is required",

    },
    genre: {
        type: String,
        required: true,
        enum: ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Thriller", "Western"]
    },
    imageUrl : {
        type: String,
        required : false
    },

    actors:
        [
            {actor_name : {type : String, required : true}, character_name : {type : String, required :true}},
            {actor_name : {type : String, required : true}, character_name : {type : String, required :true}},
            {actor_name : {type : String, required : true}, character_name : {type : String, required :true}}
        ]
});

//MovieSchema.pre('save', function(next){
//    const err = new Error("something went wrong");
//    next(err);
//})

//export model back to server
module.exports = mongoose.model('Movie', MovieSchema);