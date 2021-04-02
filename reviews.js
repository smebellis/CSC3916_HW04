var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

try {
    mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
}catch(error){
    console.log("could not connect");
}
mongoose.set('useCreateIndex', true);

//Review Schema
var ReviewSchema = new Schema({
    user_id : {
        type : Schema.Types.ObjectId,
        ref: "UserSchema",
        required: true
    },
    movie_id : {
        type : Schema.Types.ObjectId,
        ref : "MovieSchema",
        required : true
    },
    username: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true,
    },
    rating: {
        type : Number,
        required : true,
        min : 1,
        max : 5
    }

});

ReviewSchema.pre('save', function(next) {
    next();
});

//return the model to server
module.exports = mongoose.model('Review', ReviewSchema);