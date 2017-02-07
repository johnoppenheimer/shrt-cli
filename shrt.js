#!/usr/bin/env node

const program = require("commander");
const ncp = require("copy-paste");
const fs = require("fs");

program
    .version("1.0.0")
    .arguments("<url>")
    .action(function (url) {
        request("links", "POST", {
            url: url
        }, function (error, statusCode, headers, body) {
            const json = JSON.parse(body);
            const shrt_url = `https://shrt.036.fr/${json._id}`;

            ncp.copy(shrt_url, function() {
                console.log(shrt_url);
            });
        });
    })
    .option("-s, --status", "Display API status")
    .option("-H, --host <host_url>", "Set the API url", "https://shrt.036.fr")
    .parse(process.argv);

if (program.status) {
    request("health-check", "GET", {}, function (error, statusCode, headers, body) {
        console.log(JSON.parse(body).status);
    });
}

if (program.host) {
    fs.writeFileSync("host_url", program.host, "utf8");
}

function request(path, method, data, callback) {
    'use strict';

    try {
        fs.accessSync("host_url", fs.constants.R_OK)   
    } catch (error) {
        console.log("Error: you didn't set an -H --host");
        return;
    }
    
    let hostname = fs.readFileSync("host_url", "utf8");
    let protocol;

    if (hostname.indexOf("https://") === 0) {
        protocol = "https";
        hostname = hostname.substring(8, hostname.length);
    }
    else {
        protocol = "http";
        hostname = hostname.substring(7, hostname.length);
    }

    if (hostname.endsWith("/")) {
        hostname = hostname.substring(0, hostname.length - 1)
    }

    const httpTransport = require(protocol);
    const responseEncoding = 'utf8';
    const httpOptions = {
        hostname: hostname,
        path: '/' + path,
        method: method,
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    };
    httpOptions.headers['User-Agent'] = 'node ' + process.version;

    // Paw Store Cookies option is not supported

    const request = httpTransport.request(httpOptions, (res) => {
            let responseBufs = [];
            let responseStr = '';

            res.on('data', (chunk) => {
                if (Buffer.isBuffer(chunk)) {
                    responseBufs.push(chunk);
                } else {
                    responseStr = responseStr + chunk;
                }
            }).on('end', () => {
                responseStr = responseBufs.length > 0 ?
                    Buffer.concat(responseBufs).toString(responseEncoding) : responseStr;

                callback(null, res.statusCode, res.headers, responseStr);
            });

        })
        .setTimeout(0)
        .on('error', (error) => {
            callback(error);
        });
    // request.write(`{"url": "${url}"}`);
    request.write(JSON.stringify(data));
    request.end();
}