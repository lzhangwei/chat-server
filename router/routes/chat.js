var express = require('express');
var router = express.Router();
// var redis = require('redis');
// var client = redis.createClient();
var _ = require('lodash');
var mongo = require('mongodb');
var server = new mongo.Server('localhost', 27017, {auto_reconnect: true, safe: false});
var BSON = mongo.BSONPure;
var Db = new mongo.Db('chatdb', server);

Db.open(function(err, db){
  if(!err){
    console.log('connected to database ChatDb');

    db.collection('ChatLogs', {strict: true}, function(err, Books){
      if(err){
        console.log("the ChatLogs collections does not exist, creating...");
        seedChatLogDB();
      }
    });
  }
});

var seedChatLogDB = function(){
  var books = [
    {
      title: "EL CORONEL NO TIENE QUIEN LE ESCRIBA",
      year: "1961",
      author: "Gabriel García Márquez",
      country: "Colombia",
      description: "The aromas of fruit and spice...",
      picture: "cover-coronel.jpg"
    },
    {
      title: "CHANGÓ EL GRAN PUTAS",
      year: "2010",
      author: "Manuel Zapata Olivella",
      country: "Colombia",
      description: "This book is part of the volume Afro Colombian Library Books...",
      picture: "cover-coronel.jpg"
    }];

  Db.collection('books', function(err, book){
    book.insert(books, {safe:true}, function(err, result){
    });
  });
};

module.exports = router;
