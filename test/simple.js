// Generate Config
var config = function(port) {
    return {
        "service": "Light",
        "name": "Test Accessory",
        "switch": {
            "status": "http://localhost:"+port+"/power/status",
            "powerOn": "http://localhost:"+port+"/power/set/on",
            "powerOff": "http://localhost:"+port+"/power/set/off"
        },
        "color": {
            "status": "http://localhost:"+port+"/color/status",
            "url": "http://localhost:"+port+"/color/set/%s",
            "brightness": true
        }
    };
};

// Set up environment
var device = require('./device.js')();
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var plugin = require('../index.js');

// Test Switch Accessory
var homebridge = require('./homebridge.js')(new config(device.port));
plugin(homebridge);
my = homebridge.accessory;
var services = my.getServices();

describe("HTTP-RGB Accessory", function() {
    describe("constructor", function() {
        it("should have a name", function() {
            expect(my.name).to.equal("Test Accessory");
        });

        it("should have Characteristics", function() {
            expect(services).to.include.something.that.has.property('characteristics').that.includes.something;  // jshint ignore:line
        });

        it("should have Characteristic 'On'", function() {
            expect(services[0].characteristics).to.include.something.with.property('displayName', 'On');
        });

        it("should have Characteristic 'Brightness'", function() {
            expect(services[0].characteristics).to.include.something.with.property('displayName', 'Brightness');
        });

        it("should have Characteristic 'Hue'", function() {
            expect(services[0].characteristics).to.include.something.with.property('displayName', 'Hue');
        });

        it("should have Characteristic 'Saturation'", function() {
            expect(services[0].characteristics).to.include.something.with.property('displayName', 'Saturation');
        });
    });

    describe("switch", function() {
        it("getPowerState", function(done) {
            my.getPowerState(function(err, val) { expect(val).to.equal(false); done(); });
        });

        it("setPowerState: true", function(done) {
            my.setPowerState(true, function(err, val) { expect(err).to.equal(undefined); expect(val).to.equal("1"); done(); });
        });

        it("setPowerState: false", function(done) {
            my.setPowerState(false, function(err, val) { expect(err).to.equal(undefined); expect(val).to.equal("0"); done(); });
        });
    });
});
