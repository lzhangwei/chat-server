var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../client')));
// This covers serving up the index page
app.use(express.static(path.join(__dirname, '../client/.tmp')));
app.use(express.static(path.join(__dirname, '../client/app')));

// development error handler
// will print stacktrace
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: err
  });
});

app.post('/', function (request, response) {
  console.log(request.body);      // your JSON
  response.send(request.body);    // echo the result back
});


// socket.io
var users = {};
var sockets = {};

io.on('connection', function (socket) {

  console.log("---socket io connection---");

  // socket.on('connection', function(message) {
  //   console.log("---socket io on---" + message);
  // });

  // Register your client with the server, providing your username
  socket.on('init', function (userName, userRole) {
    console.log('---socket io init---' + userName + '---' + userRole);
    users[userName] = socket.id;    // Store a reference to your socket ID
    sockets[socket.id] = {username: userName, socket: socket};  // Store a reference to your socket
  });

  // Private message is sent from client with username of person you want to 'private message'
  socket.on('message', function (to, message) {
    // Lookup the socket of the user you want to private message, and send them your message
    console.log("---socket io private message---" + to + "---" + message);
    sockets[users[to]].emit(
      'message',
      {
        message: message,
        from: sockets[socket.id].username
      }
    );
  });
});


http.listen(3000);


// routes
var router = require('./router')(app);
require('./app');
module.exports = app;
