var express = require('express');
var redis = require('redis');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var conf = require('config');

const redisHost = conf.redis.host;
const redisPort = conf.redis.port;
const redisKey = conf.redis.key;
const redisChannel = conf.redis.channel;

const sioRedisHost = conf.scaleRedis.host;
const sioRedisPort = conf.scaleRedis.port;
const sioRedisKey = conf.scaleRedis.key;
const sioEventName = conf.scaleRedis.eventName;

/**
 * IDのpub/sub用 publisher
 */
var publisher = require('redis').createClient(redisPort, redisHost);
publisher.auth(redisKey, function (error) {
    if (error) {
        console.log('auth error!!!');
    }
});

/**
 * IDのpub/sub用 subscriber
 */
var subscriber = require('redis').createClient(redisPort, redisHost);
subscriber.auth(redisKey, function (error) {
    if (error) {
        console.log('auth error!!!');
    }
});

/**
 * Socket.IO-redis用 publisher
 */
var sioPublisher = require('redis').createClient(sioRedisPort, sioRedisHost);
sioPublisher.auth(sioRedisKey, function (error) {
    if (error) {
        console.log('auth error!!!');
    }
});

/**
 * Socket.IO-redis用 publisher
 */
var sioSubscriber = require('redis').createClient(sioRedisPort, sioRedisHost);
sioSubscriber.auth(sioRedisKey, function (error) {
    if (error) {
        console.log('auth error!!!');
    }
});

/**
 * Socket.IO-redis
 */
var sioRedis = require('socket.io-redis');
io.adapter(sioRedis({ pubClient: sioPublisher, subClient: sioSubscriber }));

/**
 * 外部API
 */
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
    /**
     * ID登録
     */
    socket.on(sioEventName, function (message) {
        console.log(message + ' registerd.');
        var req = https.request(options, function (res) {
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
        socket.join(message);
        socket.emit(sioEventName, message);
    });
});

/**
 * HTTP + JSONの変わりにsidをGET
 * Redisにsidをpublish
 */
app.get('/push', function (request, response) {
    console.log(request.query.sid + ' push is sended.');
    publisher.publish(redisChannel, request.query.sid);
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
        io.to(message).emit(sioEventName, 'Notify!!!');
    }
});
subscriber.subscribe(redisChannel);

var PORT = process.env.PORT || 3000;

http.listen(PORT, function () {
    console.log('listening on *:8080');
});
