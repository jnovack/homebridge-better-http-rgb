var Service, Characteristic;
var request = require('request');

/**
 * @module homebridge
 * @param {object} homebridge Export functions required to create a
 *                            new instance of this plugin.
 */
module.exports = function(homebridge){
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-better-http-rgb', 'HTTP-RGB', HTTP_RGB);
};

/**
 * Parse the config and instantiate the object.
 *
 * @summary Constructor
 * @constructor
 * @param {function} log Logging function
 * @param {object} config Your configuration object
 */
function HTTP_RGB(log, config) {

    // The logging function is required if you want your function to output
    // any information to the console in a controlled and organized manner.
    this.log = log;

    this.service                       = config.service;
    this.name                          = config.name;

    this.http_method                   = config.http_method               || 'GET';
    this.username                      = config.username                  || '';
    this.password                      = config.password                  || '';

    // Handle the basic on/off
    this.switch = { powerOn: {}, powerOff: {} };
    if (typeof config.switch === 'object') {
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
    }

    // Local caching of HSB color space for RGB callback
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
        this.color.brightness          = config.color.brightness;
        this.cache.hue = 0;
        this.cache.saturation = 0;
    } else {
        this.color = false;
    }

    this.has = { brightness: this.brightness || (typeof this.color === 'object' && this.color.brightness) };

}

/**
 *
 * @augments HTTP_RGB
 */
HTTP_RGB.prototype = {

    /** Required Functions **/
    identify: function(callback) {
        this.log('Identify requested!');
        callback();
    },

    getServices: function() {
        // You may OPTIONALLY define an information service if you wish to override
        // default values for devices like serial number, model, etc.
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, 'HTTP Manufacturer')
            .setCharacteristic(Characteristic.Model, 'homebridge-better-http-rgb')
            .setCharacteristic(Characteristic.SerialNumber, 'HTTP Serial Number');

        switch (this.service) {
            case 'Light':
                this.log('creating Lightbulb');
                var lightbulbService = new Service.Lightbulb(this.name);

                if (this.switch.status) {
                    lightbulbService
                        .getCharacteristic(Characteristic.On)
                        .on('get', this.getPowerState.bind(this))
                        .on('set', this.setPowerState.bind(this));
                } else {
                    lightbulbService
                        .getCharacteristic(Characteristic.On)
                        .on('set', this.setPowerState.bind(this));
                }

                // Handle brightness
                if (this.has.brightness) {
                    this.log('... adding Brightness');
                    lightbulbService
                        .addCharacteristic(new Characteristic.Brightness())
                        .on('get', this.getBrightness.bind(this))
                        .on('set', this.setBrightness.bind(this));
                }
                // Handle color
                if (this.color) {
                    this.log('... Ted Turnerizing(tm)');
                    lightbulbService
                        .addCharacteristic(new Characteristic.Hue())
                        .on('get', this.getHue.bind(this))
                        .on('set', this.setHue.bind(this));

                    lightbulbService
                        .addCharacteristic(new Characteristic.Saturation())
                        .on('get', this.getSaturation.bind(this))
                        .on('set', this.setSaturation.bind(this));
                }

                return [lightbulbService];

            /*
               These are included here as an example of what other
               HomeKit-compatible devices can be.
            */

            case 'Switch':
                this.log('creating Switch');
                var switchService = new Service.Switch(this.name);

                if (this.switch.powerOn.status) {
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

            case 'Lock':
                var lockService = new Service.LockMechanism(this.name);

                lockService
                    .getCharacteristic(Characteristic.LockCurrent)
                    .on('get', this.getLockCurrent.bind(this))
                    .on('set', this.setLockCurrent.bind(this));

                lockService
                    .getCharacteristic(Characteristic.LockTarget)
                    .on('get', this.getLockTarget.bind(this))
                    .on('set', this.setLockTarget.bind(this));

                return [lockService];
                
            /*
            case 'Smoke':
                var smokeService = new Service.SmokeSensor(this.name);

                smokeService
                    .getCharacteristic(Characteristic.SmokeDetected)
                    .on('set', this.getSmokeDetected.bind(this));

                return [smokeService];

            case 'Motion':
                var motionService = new Service.MotionSensor(this.name);

                motionService
                    .getCharacteristic(Characteristic.MotionDetected)
                    .on('get', this.getMotionDetected.bind(this));

                return [motionService];

            case 'Temp':
                var temperatureService = new Service.TemperatureSensor(this.name);

                temperatureService
                    .getCharacteristic(Characteristic.CurrentTemperature)
                    .on('get', this.getTemperature.bind(this));

                var humidityService = new Service.HumiditySensor(this.name);
                humidityService
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on('get', this.getHumidity.bind(this));

                return [temperatureService, humidityService];

            */

            default:
                return [informationService];

        } // end switch
    },

    //** Custom Functions **//

    /**
     * Gets power state of lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    getPowerState: function(callback) {
        if (!this.switch.status) {
            this.log.warn('Ignoring request, switch.status not defined.');
            callback(new Error('No switch.status url defined.'));
            return;
        }

        var url = this.switch.status;

        this._httpRequest(url, '', 'GET', function(error, response, responseBody) {
            if (error) {
                this.log('getPowerState() failed: %s', error.message);
                callback(error);
            } else {
                var powerOn = parseInt(responseBody) > 0;
                this.log('power is currently %s', powerOn ? 'ON' : 'OFF');
                callback(null, powerOn);
            }
        }.bind(this));
    },

    /**
     * Sets the power state of the lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    setPowerState: function(state, callback) {
        var url;
        var body;

        if (!this.switch.powerOn.set_url || !this.switch.powerOff.set_url) {
            this.log.warn('Ignoring request, powerOn.url or powerOff.url is not defined.');
            callback(new Error("The 'switch' section in your configuration is incorrect."));
            return;
        }

        if (state) {
            url = this.switch.powerOn.set_url;
            body = this.switch.powerOn.body;
        } else {
            url = this.switch.powerOff.set_url;
            body = this.switch.powerOff.body;
        }

        this._httpRequest(url, body, this.http_method, function(error, response, responseBody) {
            if (error) {
                this.log('setPowerState() failed: %s', error.message);
                callback(error);
            } else {
                this.log('setPowerState() successfully set to %s', state ? 'ON' : 'OFF');
                callback(undefined, responseBody);
            }
        }.bind(this));
    },

    /**
     * Gets brightness of lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    getBrightness: function(callback) {
        if (!this.has.brightness) {
            this.log.warn("Ignoring request; No 'brightness' defined.");
            callback(new Error("No 'brightness' defined in configuration"));
            return;
        }

        if (this.brightness) {
            this._httpRequest(this.brightness.status, '', 'GET', function(error, response, responseBody) {
                if (error) {
                    this.log('getBrightness() failed: %s', error.message);
                    callback(error);
                } else {
                    var level = parseInt(responseBody);
                    this.log('brightness is currently at %s %', level);
                    callback(null, level);
                }
            }.bind(this));
        } else {
            callback(null, this.cache.brightness);
        }
    },

    /**
     * Sets the brightness of the lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    setBrightness: function(level, callback) {
        if (!this.has.brightness) {
            this.log.warn("Ignoring request; No 'brightness' defined.");
            callback(new Error("No 'brightness' defined in configuration"));
            return;
        }
        this.cache.brightness = level;

        // If achromatic or color.brightness is false, update brightness, otherwise, update HSL as RGB
        if (!this.color || !this.color.brightness) {
            var url = this.brightness.set_url.replace('%s', level);

            this._httpRequest(url, '', this.brightness.http_method, function(error, response, body) {
                if (error) {
                    this.log('setBrightness() failed: %s', error);
                    callback(error);
                } else {
                    this.log('setBrightness() successfully set to %s %', level);
                    callback();
                }
            }.bind(this));
        } else {
            this._setRGB(callback);
        }
    },

    /**
     * Gets the hue of lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    getHue: function(callback) {
        if (this.color && typeof this.color.status !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("There was a problem parsing the 'color' section of your configuration."));
            return;
        }
        var url = this.color.status;

        this._httpRequest(url, '', 'GET', function(error, response, responseBody) {
            if (error) {
                this.log('... getHue() failed: %s', error.message);
                callback(error);
            } else {
                var rgb = responseBody;
                var levels = this._rgbToHsl(
                    parseInt(rgb.substr(0,2),16),
                    parseInt(rgb.substr(2,2),16),
                    parseInt(rgb.substr(4,2),16)
                );

                var hue = levels[0];

                this.log('... hue is currently %s', hue);
                this.cache.hue = hue;
                callback(null, hue);
            }
        }.bind(this));
    },

    /**
     * Sets the hue of the lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    setHue: function(level, callback) {
        if (this.color && typeof this.color.set_url !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("There was a problem parsing the 'color' section of your configuration."));
            return;
        }
        this.log('Caching Hue as %s ...', level);
        this.cache.hue = level;

        this._setRGB(callback);
    },

    /**
     * Gets the saturation of lightbulb.
     *
     * @param {function} callback The callback that handles the response.
     */
    getSaturation: function(callback) {
        if (this.color && typeof this.color.status !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("There was a problem parsing the 'color' section of your configuration."));
            return;
        }
        var url = this.color.status;

        this._httpRequest(url, '', 'GET', function(error, response, responseBody) {
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

                this.log('... saturation is currently %s', saturation);
                this.cache.saturation = saturation;
                callback(null, saturation);
            }
        }.bind(this));
    },

    /**
     * Sets the saturation of the lightbulb.
     *
     * @param {number} level The saturation of the new call.
     * @param {function} callback The callback that handles the response.
     */
    setSaturation: function(level, callback) {
        if (this.color && typeof this.color.set_url !== 'string') {
            this.log.warn("Ignoring request; problem with 'color' variables.");
            callback(new Error("There was a problem parsing the 'color' section of your configuration."));
            return;
        }
        this.log('Caching Saturation as %s ...', level);
        this.cache.saturation = level;

        this._setRGB(callback);
    },

    /**
     * Sets the RGB value of the device based on the cached HSB values.
     *
     * @param {function} callback The callback that handles the response.
     */
    _setRGB: function(callback) {
        var rgb = this._hsvToRgb(this.cache.hue, this.cache.saturation, this.cache.brightness);
        var r = this._decToHex(rgb.r);
        var g = this._decToHex(rgb.g);
        var b = this._decToHex(rgb.b);

        var url = this.color.set_url.replace('%s', r + g + b);

        this.log('_setRGB converting H:%s S:%s B:%s to RGB:%s ...', this.cache.hue, this.cache.saturation, this.cache.brightness, r + g + b);

        this._httpRequest(url, '', this.color.http_method, function(error, response, body) {
            if (error) {
                this.log('... _setRGB() failed: %s', error);
                callback(error);
            } else {
                this.log('... _setRGB() successfully set to #%s', r + g + b);
                callback();
            }
        }.bind(this));
    },

    /** Utility Functions **/
    /**
     * Perform an HTTP request.
     *
     * @param {string} url URL to call.
     * @param {string} body Body to send.
     * @param {method} method Method to use.
     * @param {function} callback The callback that handles the response.
     */
    _httpRequest: function(url, body, method, callback) {
        request({
            url: url,
            body: body,
            method: method,
            rejectUnauthorized: false,
            auth: {
                user: this.username,
                pass: this.password
            }
        },
        function(error, response, body) {
            callback(error, response, body);
        });
    },

    /**
     * Converts an HSV color value to RGB. Conversion formula
     * adapted from http://stackoverflow.com/a/17243070/2061684
     * Assumes h in [0..360], and s and l in [0..100] and
     * returns r, g, and b in [0..255].
     *
     * @param   {Number}  h       The hue
     * @param   {Number}  s       The saturation
     * @param   {Number}  l       The lightness
     * @return  {Array}           The RGB representation
     */
    _hsvToRgb: function(h, s, v) {
        var r, g, b, i, f, p, q, t;

        h /= 360;
        s /= 100;
        v /= 100;

        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        var rgb = { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
        return rgb;
    },

    /**
     * Converts an RGB color value to HSL. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes r, g, and b are in [0..255] and
     * returns h in [0..360], and s and l in [0..100].
     *
     * @param   {Number}  r       The red color value
     * @param   {Number}  g       The green color value
     * @param   {Number}  b       The blue color value
     * @return  {Array}           The HSL representation
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
     * @param   {Number} d        Decimal number
     * @param   {String} padding  Padding for the string
     * @return  {String}          '0' padded hexidecimal number
     */
    _decToHex: function(d, padding) {
        var hex = Number(d).toString(16).toUpperCase();
        padding = typeof (padding) === 'undefined' || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = '0' + hex;
        }

        return hex;
    }

};
