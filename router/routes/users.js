var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var server = new mongo.Server('localhost', 27017, {auto_reconnect: true, safe: false});
var BSON = mongo.BSONPure;
var Db = new mongo.Db('chatdb', server);

Db.open(function (err, db) {
  if (!err) {
    console.log('connected to database ChatDb');

    db.collection('users', {strict: true}, function (err, users) {
      if (err) {
        console.log("the Users collections does not exist, creating...");
        seedDB();
      }
    });
  }
});

router.get('/', function (req, res) {
  Db.collection("users", function (err, collection) {
    collection.find().toArray(function (err, users) {
      res.send(users);
    });
  });
});

router.post('/', function (req, res) {
  var user = req.body;

  console.log('User: ' + JSON.stringify(user));

  Db.collection('users', function (err, collection) {
    collection.insert(user, function (err, result) {
      if (!err) {
        console.log('Successful: ' + JSON.stringify(result[0]));
        res.send(result[0]);
      } else {
        res.send({'status': 500, 'error': 'Un error ha'});
      }
    });
  });
});

router.post('/login', function (req, res) {
  var user = req.body;

  console.log('User: ' + JSON.stringify(user));

  Db.collection('users', function(err, collection){
    if(!err){
      collection.findOne(user, function(err, user){
        console.log('find user---' + JSON.stringify(user));
        res.send(user);
      });
    }else{
      console.log('Error: ');
    }
  });
});

var seedDB = function () {
  var users = [
    {
      name: "zhangsanaaa",
      password: "a000000",
      role: "SERVICE",
      status: "offline"
    },
    {
      name: "lisi",
      password: "a000000",
      role: "SERVICE",
      status: "offline"
    }];

  Db.collection('users', function (err, user) {
    user.insert(users, {safe: true}, function (err, result) {
      console.log("insert successful");
    });
  });
};


module.exports = router;
