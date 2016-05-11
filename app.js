var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var util = require('util');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var mongo = require('mongodb');
var server = new mongo.Server('localhost', 27017, {auto_reconnect: true, safe: false});
var Db = new mongo.Db('chatdb', server);

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


// socket.io - chat function
var users = {};
var sockets = {};

function serviceOnline(userName) {
  Db.open(function (err, db) {
    if (!err) {
      console.log('connected to database ChatDb');
      db.collection('users').updateOne(
        {'name': userName, 'role': 'service'},
        {
          $set: {'status': 'online'}
        },
        function (err, results) {
          console.log("update result --- " + results);
        });
    }
  });
}

function addUserServiceRelation(db, userName, serviceName) {
  db.insert({'user-service': userName, 'service': serviceName});
}

function systemEmitStartChat(serviceName) {
  sockets[users[serviceName]].socket.emit('message',
    {
      message: '用户咨询开始',
      from: 'System'
    });
}

function systemEmitBusyMessage(userName) {
  sockets[users[userName]].socket.emit('message',
    {
      message: '抱歉，系统当前无可用客服人员，请稍候...',
      from: 'System'
    });
}

function findOne(query, collection, callback) {
  collection.findOne(query, callback);
}

function emitMessage(chatUserName, message, selfName) {
  sockets[users[chatUserName]].socket.emit('message',
    {
      message: message,
      from: selfName
    }
  );
}

io.on('connection', function (socket) {

  console.log("---socket io connection---");

  // Register your client with the server, providing your userName and userRole
  socket.on('init', function (userName, userRole) {
    console.log('---socket io init---' + userName + '---' + userRole);
    console.log('---socket id---' + socket.id);
    users[userName] = socket.id;    // Store a reference to your socket ID
    sockets[socket.id] = {'username': userName, 'socket': socket};  // Store a reference to your socket

    if (userRole == 'service') {
      //change user status to ONLINE
      serviceOnline(userName);
    } else if (userRole == 'user') {
      //Search online Service -> add to map -> send message to service(start chat)
      var serviceName = null;
      Db.open(function (err, db) {
        if (!err) {
          console.log('connected to database ChatDb');
          db.collection('users', function (err, collection) {
            if (!err) {
              findOne({'role': 'service', 'status': 'online'}, collection,
                function (err, data) {
                  if (data != null) {
                    serviceName = data.name;
                    //add user-service relation to db
                    addUserServiceRelation(db, userName, serviceName);
                    //send message to service
                    if (sockets[serviceName] != null) {
                      systemEmitStartChat(serviceName);
                    }
                  } else {
                    //send message to user(no online service)
                    systemEmitBusyMessage(userName);
                  }
                }
              );
            } else {
              console.log('Error: ');
            }
          });
        }
      });
    }
  });

  // Private message is sent from client with username of person you want to 'private message'
  socket.on('message', function (userName, userRole, message) {
    // Lookup the socket of the user you want to private message, and send them your message
    console.log("---socket io private message---");
    Db.open(function (err, db) {
      if (!err) {
        console.log('connected to database ChatDb');
        findOne({userRole: userName}, db.collection,
          function (err, result) {
            console.log("find result --- " + result);
            if (result != null) {
              if (userRole = 'user') {
                emitMessage(result.service, message, userName);
              } else {
                emitMessage(result.user, message, userName);
              }
            } else {
              //TODO
            }
          });
      }
    });
  });
});


http.listen(3000);


// routes
var router = require('./router')(app);
require('./app');
module.exports = app;
