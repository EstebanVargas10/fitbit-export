'use strict';

require('newrelic');

var express = require('express'),
    app = express(),
    path = require('path'),
    morgan = require('morgan'),
    connect = require('connect'),
    traverse = require('traverse'),
    passport = require('passport'),
    getConfig = require('./get-config'),
    moment = require('moment'),
    _ = require('lodash'),
    exportCsv = _.curry(require('./export-csv'))(app),
    auth = require('./auth'),
    server;

app.use(morgan());

app.use(connect.cookieParser());
app.use(connect.session({secret: getConfig(app).sessionSecret}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', function(req, res){
    var userPath = ['session', 'passport', 'user'],
        traverseReq = traverse(req),
        userExists = traverseReq.has(userPath),
        user = userExists && traverseReq.get(userPath);

    res.render('index.ejs', {
        user: user
    });
});

app.get('/diagnostics.json', function(req, res) {
    res.json({
        nodeJsVersion: process.version
    });
});

app.get('/static/foundation.js', function(req, res) {
    res.sendFile(
        require.resolve('foundation-apps/dist/js/foundation-apps.min.js'),

        // This is a shit way to do caching, but since the site is fairly low
        // traffic, hopefully this will allow repeat page views to be faster,
        // without causing a ton of issues when I do a deploy.
        {maxAge: moment.duration(10, 'minutes').asMilliseconds()}
    );
});

app.get('/static/foundation-templates.js', function(req, res) {
    res.sendFile(
        require.resolve('foundation-apps/dist/js/foundation-apps-templates.min.js'),

        // This is a shit way to do caching, but since the site is fairly low
        // traffic, hopefully this will allow repeat page views to be faster,
        // without causing a ton of issues when I do a deploy.
        {maxAge: moment.duration(10, 'minutes').asMilliseconds()}
    );
});

app.get(/^\/assets\/img\/iconic\/(.*)$/, function(req, res) {
    res.sendFile(
        // This will just 500 instead of 404ing if the file is not found.
        // Not great, but for a side project I don't think it's the end of the world.
        require.resolve(`foundation-apps/iconic/${req.params[0]}`),

        // This is a shit way to do caching, but since the site is fairly low
        // traffic, hopefully this will allow repeat page views to be faster,
        // without causing a ton of issues when I do a deploy.
        {maxAge: moment.duration(10, 'minutes').asMilliseconds()}
    );
});


app.use('/static', express.static('static'));

app.get('/export.csv', exportCsv);

// https://github.com/visionmedia/express/pull/2165
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', require('ejs'));

auth(app);

// I don't know why but the 0.0.0.0 was necessary for
// my phone to be able to connect, even though
// it wasn't always.
server = app.listen(getConfig(app).port, '0.0.0.0', function() {
    console.log(require('../package').name + ' express app listening at', server.address());
});
