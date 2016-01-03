module.exports = function() {
    // Fire up fake API server
    var express = require("express");
    var app = express();

    app.get("/power/status", function(req, res) {
        res.send("0");
    });

    app.get("/power/on", function(req, res) {
        res.send("OK");
    });

    app.get("/power/off", function(req, res) {
        res.send("OK");
    });

    var server = app.listen(0);
    return { port: server.address().port };
};