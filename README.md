# homebridge-http

Supports https devices on the HomeBridge Platform and provides a readable
callback for getting and setting the following characteristics to Homekit:

* Characteristic.On
* Characteristic.Brightness
* Characteristic.Hue
* Characteristic.Saturation

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install homebridge-http using: npm install -g homebridge-http
3. Update your configuration file. See `sample-config.json` in this repository
for a sample.

# Configuration

This module has recently been updated to support an additional method to read
the power state of the device and the brightness level. Specify the
`status_url` in your config.json that returns the status of the device as an
integer (`0` = off, `1` = on).

If your device does not support `brightness` or `color`, omit those sections
from the configuration.

## Structure

The following is an overview of the structure of your HTTP accessory.

Both `powerOn` and `powerOff` can either be a `string` or an `object`.  If a
`string` is provided it is filled in as the `url` and the `body` will be blank.

Additionally, both `brightness` and `color` share the same structure, they can
either be a `string` or an `object`.  If it is a `string`, it is filled in as
the `status` and the other fields are left blank. In this instance, you can
only read the settings, you may not change them.


    {
        "accessory": "HTTP",
        "name": string,
        "service": string,

        "http_method": string-optional,
        "username": string-optional,
        "password": string-optional,
        "sendImmediately": string-optional,

        "switch": {
            "status": url-optional,
            "powerOn": string-or-object,
            "powerOff": {
                url: string,
                body: string
            }
        },

        "brightness": string-or-object,

        "color": {
            "status": url-status,
            "url": url-optional,
            "http_method": string-optional
        }
    }


## Samples:


    "accessories": [
        {
            "accessory": "HTTP",
            "name": "RGB Led Strip",
            "service": "Light",

            "switch": {
                "status": "http://localhost/api/v1/status",
                "powerOn": "http://localhost/api/v1/on",
                "powerOff": "http://localhost/api/v1/off"
            },

            "brightness": {
                "status": "http://localhost/api/v1/brightness",
                "url": "http://localhost/api/v1/brightness/%s"
            },

            "color": {
                "status": "http://localhost/api/v1/set",
                "url": "http://localhost/api/v1/set/%s"
            }
        }
    ]

# Interfacing

All the `.status` urls expect a 200 HTTP status code and a body of a single
string with no HTML markup.

* `switch.status` expects `0` for Off, and `1` for On.
* `brightness.status` expects a number from 0 to 100.
* `color.status` expects a 6-digit hexidemial number.