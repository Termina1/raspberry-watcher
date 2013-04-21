dropbox = require('dropbox');
fs = require('fs');
require('sugar');

RKEY = 'raspberry:torrent';

var redis = require("redis"), rclient = redis.createClient();

var KEY = '7hm2dro53iytw7o';
var TOKEN = '5mbjd3ahl04i2n2';

var client = new dropbox.Client({ key: KEY, secret: TOKEN });
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

client.authDriver(simpleDriver);

client.authenticate(function(error, client) {
  setInterval(function() {
    processLoop(client);
  }, 1000);
});

function processLoop(client) {
  rclient.get('raspberry:torrent', function(err, data) {
    var prev;
    if(!err && data) {
      prev = JSON.parse(data);
    } 

    if(!prev) {
      prev = [];
    }

    client.readdir('Apps/torrents', function(err, data) {
      var newdata = data.sort();
      var diff = newdata.subtract(prev);
      for(var i = 0; i < diff.length; i++) {
        dumpFile(diff[i], client);
      }
      rclient.set(RKEY, JSON.stringify(newdata));
    });
  });
}

function dumpFile(file, client) {
  console.log('downloading ' + file + '\n');
  client.readFile("Apps/torrents/" + file, function(err, data) {
    if(!err) {
      fs.writeFile(file, data);
    }
  });
}