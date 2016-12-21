var express = require('express');
var redis = require('redis');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var publisher = require("redis").createClient(6379, 'atoriredis.redis.cache.windows.net');
publisher.auth('wvSGKLKzvtApqxs4RUdx0ORbzYp5CR8S4NgUXl/kYjE=', function (err) {
    if (err) {
        console.log('auth error!!!');
    }
});

var subscriber = require("redis").createClient(6379, 'atoriredis.redis.cache.windows.net');
subscriber.auth('wvSGKLKzvtApqxs4RUdx0ORbzYp5CR8S4NgUXl/kYjE=', function (err) {
    if (err) {
        console.log('auth error!!!');
    }
});

var ioredis = require('socket.io-redis');
io.adapter(ioredis({
    host: 'atoriredis.redis.cache.windows.net',
    port: 6379 ,
    auth_pass: 'wvSGKLKzvtApqxs4RUdx0ORbzYp5CR8S4NgUXl/kYjE='
}));

var https = require('https');

var options = {
    host: '9ohz7mz88h.execute-api.ap-northeast-1.amazonaws.com',
    port: 443,
    path: '/beta',
//        secureProtocol: 'SSLv3_method',
    secureProtocol: 'TLSv1_method',
    method: 'POST'
};

app.use(express.static(__dirname));

/**
 * 確認画面
 */
app.get('/', function (req, res) {
    res.sendfile('index.html');
});

/**
 * WebSocketサーバ
 */
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    socket.on('register', function (message) {
        console.log(message + ' registerd.');
/*        var req = https.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);

            res.on('data', function (d) {
                process.stdout.write(d);
            });
        });
        req.end();

        req.on('error', function (e) {
            console.error(e);
        });
*/
        socket.join(message);
        socket.emit('register', message);
    });
});

/**
 * HTTP + JSONの変わりにsidをGET
 * Redisにsidをpublish
 */
app.get('/push', function (request, response) {
    console.log(request.query.sid + ' push is sended.');
    publisher.publish("notify:sid", request.query.sid);
    response.send('push is sended.');
})

/**
 * Redisのsidをsubscribして
 * WebSocketにemit
 */
subscriber.on("message", function (channel, message) {
    console.log("sessionID " + message + " was read.");
    var clients = io.sockets.adapter.rooms[message];
    if (clients) {
        io.to(message).emit('register', 'Notify!!!');
    }
});
subscriber.subscribe("notify:sid");

var PORT = process.env.PORT || 3000;

http.listen(PORT, function () {
    console.log('listening on *:8080');
});
