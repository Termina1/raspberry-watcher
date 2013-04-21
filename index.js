dropbox = require('dropbox');
fs = require('fs');
require('sugar');
path = require('path');

RKEY = 'raspberry:torrent';
RTOKEN = 'raspberry:credentials'

var redis = require("redis"), rclient = redis.createClient();

var KEY = '7hm2dro53iytw7o';
var TOKEN = '5mbjd3ahl04i2n2';
var wacthDir = '';
var writeDir = '';

var simpleDriver = {
  url: function() { return ""; },
  doAuthorize: function(authUrl, token, tokenSecret, callback) {
    console.log("Visit the following in a browser, then press Enter\n" +
                authUrl + "\n");
    var onEnterKey = function() {
      process.stdin.removeListener("data", onEnterKey);
      callback(token);
    }
    process.stdin.addListener("data", onEnterKey);
    process.stdin.resume();
  }
};

module.exports = function(watch, write) {
  wacthDir =  watch;
  writeDir = write;
  rclient.get(RTOKEN, function(err, data) {
    var client;
    if(data) {
      data = JSON.parse(data);
      client = new dropbox.Client({ key: KEY, secret: TOKEN, token: data.token, tokenSecret: data.tokenSecret });
      processLoop(client);
    } else {
      client = new dropbox.Client({ key: KEY, secret: TOKEN });
      client.authDriver(simpleDriver);
      client.authenticate(function(error, client) {
        rclient.set(RTOKEN, JSON.stringify(client.oauth));
        processLoop(client);
      });
    }
  });
}

function processLoop(client) {
  rclient.get(RKEY, function(err, data) {
    var prev;
    if(!err && data) {
      prev = JSON.parse(data);
    } 

    if(!prev) {
      prev = [];
    }

    client.readdir(wacthDir, function(err, data) {
      var newdata = data.sort();
      var diff = newdata.subtract(prev);
      diff = diff.filter(function(el) { return el.match(/\.torrent$/); });
      for(var i = 0; i < diff.length; i++) {
        dumpFile(diff[i], client);
      }
      rclient.set(RKEY, JSON.stringify(newdata));
      setTimeout(function() { processLoop(client); }, 1000);
    });
  });
}

function dumpFile(file, client) {
  console.log('downloading ' + file + '\n');
  client.readFile(path.join(wacthDir, file), function(err, data) {
    if(!err) {
      fs.writeFile(path.join(writeDir, file), data);
    }
  });
}