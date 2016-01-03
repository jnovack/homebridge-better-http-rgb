// Generate Config
var config = function(port) {
    return {
        "name": "Default Switch Accessory",
        "switch": {
            "status": "http://localhost:"+port+"/power/status",
            "powerOn": "http://localhost:"+port+"/power/on",
            "powerOff": "http://localhost:"+port+"/power/off"
        }
    };
};


// Set up environment
var device = require('./device.js');
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var plugin = require('../index.js');


// Instantiate Plugin
var homebridge = require('./homebridge.js')(new config(device.port));
plugin(homebridge);
my = homebridge.accessory;
var services = my.getServices();

// Do the testings
describe("HTTP Switch Accessory", function() {
    describe("constructor", function() {
        it("should have Characteristics", function() {
            expect(services).to.include.something.that.has.property('characteristics').that.includes.something;
        });

        it("should have Characteristic 'On'", function() {
            expect(services[0].characteristics).to.include.something.with.property('displayName', 'On');
        });

        it("should have a name", function() {
            expect(my.name).to.equal("Default Switch Accessory");
        });
    });
    describe("switch", function() {
        it("getPowerState", function(done) {
            my.getPowerState(function(err, val) { expect(val).to.equal(false); done(); });
        });

        it("setPowerState: true", function(done) {
            my.setPowerState(true, function(err) { expect(err).to.equal(undefined); done(); });
        });

        it("setPowerState: false", function(done) {
            my.setPowerState(false, function(err) { expect(err).to.equal(undefined); done(); });
        });

    });
});