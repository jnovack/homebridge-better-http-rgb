// Generate Config
var config = function(port, service) {
    return {
        "service": service,
        "name": "Test " + service + " Accessory",
        "switch": {
            "status": "http://localhost:"+port+"/power/status",
            "powerOn": "http://localhost:"+port+"/power/set/on",
            "powerOff": "http://localhost:"+port+"/power/set/off"
        },
        "color": {
            "status": "http://localhost:"+port+"/color/status",
            "url": "http://localhost:"+port+"/color/set/%s",
            "brightness": true
        },
        "brightness": {
            "status": "http://localhost:"+port+"/brightness/status",
            "url": "http://localhost:"+port+"/brightness/set/%s"
        }
    };
};

// Set up environment
var device = require('./device.js')();
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var plugin = require('../index.js');

// Define Accessories
var homebridge = [];
homebridge['lightbulbService'] = require('./homebridge.js')(new config(device.port, 'Light'));
homebridge['switchService'] = require('./homebridge.js')(new config(device.port, 'Switch'));

// Instantiate the lightbulService
plugin(homebridge['lightbulbService']);
var lightbulbaccessory = homebridge['lightbulbService'].accessory;
var lightbulbService = lightbulbaccessory.getServices();

// Instantiate the switchService
plugin(homebridge['switchService']);
var switchaccessory = homebridge['switchService'].accessory;
var switchService = switchaccessory.getServices();

describe("HTTP-RGB Accessory", function() {
    describe("switchService", function() {
        it("should have a name", function() {
            expect(switchaccessory.name).to.equal("Test Switch Accessory");
        });
        it("should have Characteristics", function() {
            expect(switchService).to.include.something.that.has.property('characteristics').that.includes.something;  // jshint ignore:line
        });
        it("should have Characteristic 'On'", function() {
            expect(switchService[0].characteristics).to.include.something.with.property('displayName', 'On');
        });
        describe("HTTP API", function() {
            it("getPowerState", function(done) {
                switchaccessory.getPowerState(function(err, val) { expect(val).to.equal(false); done(); });
            });

            it("setPowerState: true", function(done) {
                switchaccessory.setPowerState(true, function(err, val) { expect(err).to.equal(undefined); expect(val).to.equal("1"); done(); });
            });

            it("setPowerState: false", function(done) {
                switchaccessory.setPowerState(false, function(err, val) { expect(err).to.equal(undefined); expect(val).to.equal("0"); done(); });
            });
        });
    });

    describe("lightbulbService", function() {
        it("should have a name", function() {
            expect(lightbulbaccessory.name).to.equal("Test Light Accessory");
        });
        it("should have Characteristics", function() {
            expect(lightbulbService).to.include.something.that.has.property('characteristics').that.includes.something;  // jshint ignore:line
        });
        it("should have Characteristic 'On'", function() {
            expect(lightbulbService[0].characteristics).to.include.something.with.property('displayName', 'On');
        });
        it("should have Characteristic 'Brightness'", function() {
            expect(lightbulbService[0].characteristics).to.include.something.with.property('displayName', 'Brightness');
        });

        it("should have Characteristic 'Hue'", function() {
            expect(lightbulbService[0].characteristics).to.include.something.with.property('displayName', 'Hue');
        });

        it("should have Characteristic 'Saturation'", function() {
            expect(lightbulbService[0].characteristics).to.include.something.with.property('displayName', 'Saturation');
        });
        describe("HTTP API", function() {
            it("getPowerState", function(done) {
                lightbulbaccessory.getPowerState(function(err, val) { expect(val).to.equal(false); done(); });
            });

            it("setPowerState: true", function(done) {
                lightbulbaccessory.setPowerState(true, function(err, val) { expect(err).to.equal(undefined); expect(val).to.equal("1"); done(); });
            });

            it("setPowerState: false", function(done) {
                lightbulbaccessory.setPowerState(false, function(err, val) { expect(err).to.equal(undefined); expect(val).to.equal("0"); done(); });
            });

            it("getHue", function(done) {
                lightbulbaccessory.getHue(function(err, val) { expect(err).to.equal(null); expect(val).to.equal(120); done(); });
            });

            it("getSaturation", function(done) {
                lightbulbaccessory.getSaturation(function(err, val) { expect(err).to.equal(null); expect(val).to.equal(100); done(); });
            });

            it("getBrightness", function(done) {
                lightbulbaccessory.getBrightness(function(err, val) { expect(err).to.equal(null); expect(val).to.equal(50); done(); });
            });

        });
    });
});
