module.exports = function() {
    // Fire up fake API server
    var express = require("express");
    var app = express();

    var cache = {
        power: 0
    };

    app.get("/power/status", function(req, res) {
        res.send(cache.power.toString());
    });

    app.get("/power/set/on", function(req, res) {
        cache.power = 1;
        res.send(cache.power.toString());
    });

    app.get("/power/set/off", function(req, res) {
        cache.power = 0;
        res.send(cache.power.toString());
    });

    var server = app.listen(0);
    return { port: server.address().port };
};