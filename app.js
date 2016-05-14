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

function updateServiceStatus(serviceName, status) {
  console.log("update service status:" + serviceName + "--" +status);
  Db.open(function (err, db) {
    if (!err) {
      db.collection('users').updateOne(
        {'name': serviceName, 'role': status},
        {
          $set: {'status': 'online'}
        },
        function (err, results) {
          if (!err) {
            console.log("update result --- " + results);
          } else {
            console.log("---ERROR--- change service online")
          }
        });
    } else {
      console.log('---ERROR--- service online: open database');
    }
  });
}

function addUserServiceRelation(db, userName, serviceName) {
  db.collection('user_service', function (err, collection) {
    console.log("add user service relation: userName-" + userName + " serviceName-" + serviceName);
    collection.insert({'user': userName, 'service': serviceName}, function (err, result) {
      console.log('add user service relation' + err + '---' + JSON.stringify(result));
    });
  });
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

function systemEmitChatOver(serviceName) {
  sockets[users[serviceName]].socket.emit('message',
    {
      message: '用户已结束对话',
      from: 'System'
    });
}

function findOne(query, collection, callback) {
  console.log("find one query:" + JSON.stringify(query));
  collection.findOne(query, callback);
}

function emitMessage(chatUserName, message, selfName) {
  console.log("---emit message--- chat user:" + chatUserName + "---self name:" + selfName);
  sockets[users[chatUserName]].socket.emit('message',
    {
      message: message,
      from: selfName
    }
  );
}

function userFindService(db, userName, message) {
  db.collection('users', function (err, collection) {
    if(!err) {
      console.log("user find service - user name: "+userName);
      findOne({'role': 'service', 'status': 'online'}, collection,
        function (err, data) {
          if (!err && data != null) {
            var serviceName = data.name;
            console.log("find service success! service name: " + serviceName);
            //add user-service relation to db
            addUserServiceRelation(db, userName, serviceName);
            //updat service status to busy
            updateServiceStatus(serviceName, 'busy');
            //send message to service
            console.log("user send message to service");
            emitMessage(serviceName,message,userName);
            // if (sockets[serviceName] != null) {
            //   systemEmitStartChat(serviceName);
            // }
          } else {
            console.log("find service error!");
            //send message to user(no online service)
            systemEmitBusyMessage(userName);
          }
        }
      );
    }
  });
}

io.on('connection', function (socket) {
  // Register your client with the server, providing your userName and userRole
  socket.on('init', function (userName, userRole) {
    users[userName] = socket.id;    // Store a reference to your socket ID
    sockets[socket.id] = {'username': userName, 'socket': socket};  // Store a reference to your socket

    if (userRole == 'service') {
      //change user status to ONLINE
      updateServiceStatus(userName, 'service');
    }
  });

  // Private message is sent from client with username of person you want to 'private message'
  socket.on('message', function (userName, userRole, message) {
    // Lookup the socket of the user you want to private message, and send them your message
    console.log("---socket io private message---");
    Db.open(function (err, db) {
      if (!err) {
        //find user-service
        db.collection('user_service', function (err, collection) {
          if (!err) {
            console.log("send message: self role and name-" + "userRole-" + userRole + "--userName-" + userName);
            var query;
            if(userRole == 'user') {
              query = {"user": userName};
            } else if(userRole == "service") {
              query = {"service": userName};
            }
            findOne(query, collection,
              function (err, result) {
                console.log("find user service relation --" + err + JSON.stringify(result));
                if (!err && result != null && result != "") {
                  console.log("send message:find result --- " + result);
                  //send message
                  if (userRole == 'user') {
                    console.log("-----------user send message to service ----------");
                    emitMessage(result.service, message, userName);
                  } else if (userRole == 'service') {
                    console.log("-----------service send message to service ----------");
                    emitMessage(result.user, message, userName);
                  }
                } else {
                  if (userRole == 'user') {
                    console.log("user find service call: userName-" + userName);
                    userFindService(db, userName, message);
                  } else if (userRole == 'service') {
                    updateServiceStatus(userName, 'online');
                    systemEmitChatOver(userName);
                  }
                }
              });
          } else {
            console.log("---ERROR--- send message: open db")
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
