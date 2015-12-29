var Service, Characteristic;
var request = require("request");

module.exports = function(homebridge){
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-http", "HTTP", HTTPAccessory);
};


function HTTPAccessory(log, config) {
    this.log = log;

    this.service                       = config.service                   || "Switch";
    this.name                          = config.name;

    this.http_method                   = config.http_method               || "GET";
    this.username                      = config.username                  || "";
    this.password                      = config.password                  || "";
    this.sendimmediately               = config.sendimmediately           || "";

    this.switch = { powerOn: {}, powerOff: {} };
    this.switch.status                 = config.switch.status;

    // Intelligently handle if config.switch.powerOn is an object or string.
    if (typeof config.switch.powerOn === 'object') {
        this.switch.powerOn.set_url    = config.switch.powerOn.url;
        this.switch.powerOn.body       = config.switch.powerOn.body;
    } else {
        this.switch.powerOn.set_url    = config.switch.powerOn;
    }

    // Intelligently handle if config.switch.powerOff is an object or string.
    if (typeof config.switch.powerOff === 'object') {
        this.switch.powerOff.set_url   = config.switch.powerOff.url;
        this.switch.powerOff.body      = config.switch.powerOff.body;
    } else {
        this.switch.powerOff.set_url   = config.switch.powerOff;
    }

    // Local caching of HSB color space for one RGB callback
    this.cache = {};

    // Handle brightness
    if (typeof config.brightness === 'object') {
        this.brightness = {};
        this.brightness.status         = config.brightness.status;
        this.brightness.set_url        = config.brightness.url            || this.brightness.status;
        this.brightness.http_method    = config.brightness.http_method    || this.http_method;
        this.cache.brightness = 0;
    } else {
        this.brightness = false;
        this.cache.brightness = 100;
    }

    // Color handling
    if (typeof config.color === 'object') {
        this.color = {};
        this.color.status              = config.color.status;
        this.color.set_url             = config.color.url                 || this.color.status;
        this.color.http_method         = config.color.http_method         || this.http_method;
        this.cache.hue = 0;
        this.cache.saturation = 0;
    } else {
        this.color = false;
    }

}

HTTPAccessory.prototype = {

    //** Required Functions **//
    identify: function(callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function() {
        // you can OPTIONALLY create an information service if you wish to override
        // the default values for things like serial number, model, etc.
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "HTTP Manufacturer")
            .setCharacteristic(Characteristic.Model, "HTTP Model")
            .setCharacteristic(Characteristic.SerialNumber, "HTTP Serial Number");

        if (this.service == "Switch") {
            var switchService = new Service.Switch(this.name);

            if (this.switchHandling == "yes") {
                switchService
                    .getCharacteristic(Characteristic.On)
                    .on('get', this.getPowerState.bind(this))
                    .on('set', this.setPowerState.bind(this));
            } else {
                switchService
                    .getCharacteristic(Characteristic.On)
                    .on('set', this.setPowerState.bind(this));
            }
            return [switchService];

        } else if (this.service == "Light") {
            var lightbulbService = new Service.Lightbulb(this.name);

            if (this.switchHandling == "yes") {
                lightbulbService
                    .getCharacteristic(Characteristic.On)
                    .on('get', this.getPowerState.bind(this))
                    .on('set', this.setPowerState.bind(this));
            } else {
                lightbulbService
                    .getCharacteristic(Characteristic.On)
                    .on('set', this.setPowerState.bind(this));
            }

            if (this.brightnessHandling == "yes") {
                lightbulbService
                    .addCharacteristic(new Characteristic.Brightness())
                    .on('get', this.getBrightness.bind(this))
                    .on('set', this.setBrightness.bind(this));
            }

            // Handle color
            if (this.color) {
                this.log('Ted Turnerizing(tm)...');
                lightbulbService
                    .addCharacteristic(new Characteristic.Hue())
                    .on('get', this.getHue.bind(this))
                    .on('set', this.setHue.bind(this));

                lightbulbService
                    .addCharacteristic(new Characteristic.Saturation())
                    .on('get', this.getSaturation.bind(this))
                    .on('set', this.setSaturation.bind(this));
            }

            return [informationService, lightbulbService];
        }
    },

    //** Custom Functions **//

    // Power
    getPowerState: function(callback) {
        if (!this.switch.status) {
            this.log.warn("Ignoring request, switch.status not defined.");
            callback(new Error("No switch.status url defined."));
            return;
        }

        var url = this.switch.status;
        this.log("Getting power state");

        this._httpRequest(url, "", "GET", function(error, response, responseBody) {
            if (error) {
                this.log('getPowerState() failed: %s', error.message);
                callback(error);
            } else {
                var binaryState = parseInt(responseBody);
                var powerOn = binaryState > 0;
                this.log("Power is currently %s", powerOn ? "ON" : "OFF");
                callback(null, powerOn);
            }
        }.bind(this));
    },

    setPowerState: function(state, callback) {
        var url;
        var body;

        if (!this.switch.powerOn.set_url || !this.switch.powerOff.set_url) {
            this.log.warn("Ignoring request, powerOn.url or powerOff.url is not defined.");
            callback(new Error("The 'switch' section in your configuration is incorrect."));
            return;
        }

        if (state) {
            url = this.switch.powerOn.set_url;
            body = this.switch.powerOn.body;
            this.log("Setting power to ON");
        } else {
            url = this.switch.powerOff.set_url;
            body = this.switch.powerOff.body;
            this.log("Setting power to OFF");
        }

        this._httpRequest(url, body, this.http_method, function(error, response, responseBody) {
            if (error) {
                this.log('setPowerState() failed: %s', error.message);
                callback(error);
            } else {
                this.log('setPowerState() succeeded!');
                callback();
            }
        }.bind(this));
    },

    // Brightness
    getBrightness: function(callback) {
        if (!this.brightness) {
            this.log.warn("Ignoring request; No brightness not defined.");
            callback(new Error("Brightness not defined."));
            return;
        }
        this.log("Getting Brightness level");

        this._httpRequest(this.brightness.status, "", "GET", function(error, response, responseBody) {
            if (error) {
                this.log('HTTP get brightness function failed: %s', error.message);
                callback(error);
            } else {
                var level = parseInt(responseBody);
                this.log("brightness state is currently %s", level);
                callback(null, level);
            }
        }.bind(this));
    },

    setBrightness: function(level, callback) {
        if (!this.brightness) {
            this.log.warn("Ignoring request; No brightness not defined.");
            callback(new Error("Brightness not defined."));
            return;
        }
        this.log("Setting brightness to %s", level);
        this.cache.brightness = level;

        // If achromatic, then update brightness, otherwise, update HSL as RGB
        if (!this.color) {
            var url = this.brightness.set_url.replace("%b", level);

            this._httpRequest(url, "", this.brightness.http_method, function(error, response, body) {
                if (error) {
                    this.log('setBrightness() failed: %s', error);
                    callback(error);
                } else {
                    this.log('setBrightness() succeeded!');
                    callback();
                }
            }.bind(this));
        } else {
            _setRGB(callback);
        }
    },

    /**
     * Gets Hue of lightbulb.
     *
     * @param {function} callback - The callback that handles the response.
     */
    getHue: function(callback) {
        if (this.color && typeof this.color.status !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("color issue."));
            return;
        }
        this.log("Getting hue ...");
        var url = this.color.url;

        this._httpRequest(url, "", "GET", function(error, response, responseBody) {
            if (error) {
                this.log('... getSaturation() failed: %s', error.message);
                callback(error);
            } else {
                var rgb = responseBody;
                var levels = this._rgbToHsl(
                    parseInt(rgb.substr(0,2),16),
                    parseInt(rgb.substr(2,2),16),
                    parseInt(rgb.substr(4,2),16)
                );

                var hue = levels[0];

                this.log("... hue is currently %s", hue);
                this.cache.hue = hue;
                callback(null, hue);
            }
        }.bind(this));
    },

    /**
     * Sets the hue of the lightbulb.  Within the context of the iOS color
     * picker, all three (hue, saturation, and if allowed, brightness) will
     * be set individually. There is no instance where Hue will be set but
     * Saturation is not, so we will do nothing except update the cache here.
     *
     * @summary Sets the hue of lightbulb.
     * @param {function} callback - The callback that handles the response.
     */
    setHue: function(level, callback) {
        if (this.color && typeof this.color.set_url !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("color issue."));
            return;
        }
        this.log("Setting Hue to %s ...", level);
        this.cache.hue = level;
        callback();

        // var url = this.color.set_url.replace("%c", level);
        // this._httpRequest(url, "", this.color.http_method, function(error, response, body) {
        //   if (error) {
        //     this.log('... setHue() failed: %s', error);
        //     callback(error);
        //   } else {
        //     this.log('... setHue() succeeded!');
        //     callback();
        //   }
        // }.bind(this));
    },

    /**
     * Gets the saturation level of lightbulb.
     *
     * @param {function} callback - The callback that handles the response.
     */
    getSaturation: function(callback) {
        if (this.color && typeof this.color.status !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("color issue."));
            return;
        }
        this.log("Getting saturation ...");
        var url = this.color.status;

        this._httpRequest(url, "", "GET", function(error, response, responseBody) {
            if (error) {
                this.log('... getSaturation() failed: %s', error.message);
                callback(error);
            } else {
                var rgb = responseBody;
                var levels = this._rgbToHsl(
                    parseInt(rgb.substr(0,2),16),
                    parseInt(rgb.substr(2,2),16),
                    parseInt(rgb.substr(4,2),16)
                );

                var saturation = levels[1];

                this.log("... saturation is currently %s", saturation);
                this.cache.saturation = saturation;
                callback(null, saturation);
            }
        }.bind(this));
    },

    /**
     * Sets the saturation level of the current color.
     *
     * @param {number} level - The saturation of the new call.
     * @param {function} callback - The callback that handles the response.
     */
    setSaturation: function(level, callback) {
        if (this.color && typeof this.color.url !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("color issue."));
            return;
        }
        this.log("Setting Hue to %s ...", level);
        this.cache.saturation = level;

        if (this.brightness) {
            callback();
        } else {
            this.log('Brightness is set, deferring update.');
            _setRGB(callback);
        }
    },

    _setRGB: function(callback) {
        var rgb = _hslToRgb(this.cache.hue, this.cache.saturation, this.cache.brightness);
        var r = this._decToHex(rgb[0]);
        var g = this._decToHex(rgb[1]);
        var b = this._decToHex(rgb[2]);

        var url = this.color.set_url.replace("%c", r + g + b);

        this.log("Setting RGB to %s ...", r + g + b);

        if (!this.brightnessHandling)
        this._httpRequest(url, "", this.color.http_method, function(error, response, body) {
            if (error) {
                this.log('... setSaturation() failed: %s', error);
                callback(error);
            } else {
                this.log('... setSaturation() succeeded!');
                callback();
            }
        }.bind(this));

    },

    //** Utility Functions **/
    _httpRequest: function(url, body, method, callback) {
        request({
            url: url,
            body: body,
            method: method,
            rejectUnauthorized: false,
            auth: {
                user: this.username,
                pass: this.password,
                sendImmediately: this.sendimmediately
            }
        },
        function(error, response, body) {
            callback(error, response, body);
        });
    },

    /**
     * Converts an HSL color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h in [0..360], and s and l in [0..100] and
     * returns r, g, and b in [0..255].
     *
     * @param   Number  h       The hue
     * @param   Number  s       The saturation
     * @param   Number  l       The lightness
     * @return  Array           The RGB representation
     */
    _hslToRgb: function(h, s, l){
        h /= 360;
        s /= 100;
        l /= 100;

        var r, g, b;

        if(s === 0){
            r = g = b = l; // achromatic
        }else{
            var hue2rgb = function hue2rgb(p, q, t){
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },

    /**
     * Converts an RGB color value to HSL. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes r, g, and b are in [0..255] and
     * returns h in [0..360], and s and l in [0..100].
     *
     * @param   Number  r       The red color value
     * @param   Number  g       The green color value
     * @param   Number  b       The blue color value
     * @return  Array           The HSL representation
     */
    _rgbToHsl: function(r, g, b){
        r /= 255;
        g /= 255;
        b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if(max == min){
            h = s = 0; // achromatic
        }else{
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        h *= 360; // return degrees [0..360]
        s *= 100; // return percent [0..100]
        l *= 100; // return percent [0..100]
        return [parseInt(h), parseInt(s), parseInt(l)];
    },

    /**
     * Converts a decimal number into a hexidecimal string, with optional
     * padding (default 2 characters).
     *
     * @param   Number d        Decimal number
     * @param   String padding  Padding for the string
     * @return  String          "0" padded hexidecimal number
     */
    _decToHex: function(d, padding) {
        var hex = Number(d).toString(16);
        padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex;
    }

};