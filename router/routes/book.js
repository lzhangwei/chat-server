var mongo       = require('mongodb'),
    server      = new mongo.Server('localhost', 27017, {auto_reconnect: true, safe: false}),
    BSON        = mongo.BSONPure,
    Db          = new mongo.Db('chatdb', server);

//open databse
Db.open(function(err, db){
  if(!err){
    console.log('connected to database BookDb');

    db.collection('Books', {strict: true}, function(err, Books){
      if(err){
        console.log("the Books collections does not exist, creating...");
        seedDB();
      }
    });
  }
});

var findAllBooks = findAllBooks = function ( req, res ){
  Db.collection("books", function(err, collection){
    collection.find().toArray(function(err, books){
      res.send(books);
    });
  });
};

var findOneBook = findById = function ( req, res ){
  var id = req.params.id;
  console.log("finding Book with id: ", id );

  Db.collection('books', function(err, collection){
    if(!err){
      collection.findOne({'_id': new BSON.ObjectID(id)}, function(err, book){
        res.send(book);
      });
    }else{
      console.log('Error: ');
    }
  });
};

var newBook = addBook = function ( req, res ){
  var book = req.body;
  console.log("agregando libro: "+ JSON.stringify(book));
  Db.collection('books', function(err, collection){
    collection.insert('book', function(err, result){
      if(!err){
        console.log('Successful: '+ JSON.stringify(result[0]))
        res.send(result[0]);
      }else{
        res.send({'status': 500, 'error': 'Un error ha ocurrido'});
      }
    });
  });
};

var updateOneBook = updateBook = function ( req, res ){
  var id = req.params.id;
  var book = req.body;
  console.log( "Updating the book with id: " + id );
  console.log( JSON.stringify(book) );
  Db.collection('books', function(err, collection){
    collection.update({'_id': new BSON.ObjectID(id)}, book, function(err, result){
      if( !err ){
        console.log("Updating book: " + JSON.stringify(result));
        res.send(book);
      }else{
        console.log("error updating Book");
        res.send({'status': 500, 'error':'An error has ocurred'});
      }
    });
  });
};

var deleteOneBook = deleteBook = function ( req, res ){
  var id = req.params.id;
  console.log("preparing to delete a book with id: "+ id);
  Db.collection('books', function(err, collection){
    collection.delete({'_id': new BSON.ObjectID(id)}, {safe: true}, function(err, result){
      if( !err ){
        res.send("The document was deleted: "+ result );
      }else{
        res.send({'error': 'an error was occurred'});
      }
    });
  });
};

var seedDB = function(){
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
}

module.exports = {
  "findAllBooks":    findAllBooks,
  "findOneBook":     findOneBook,
  "newBook":         addBook,
  "updateOneBook":   updateBook,
  "deleteOneBook":   deleteBook
};
