const electron = require('electron')
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const path = require('path')
const url = require('url')
const ipc = require('electron').ipcMain;
const request = require('request');
const fs = require('fs');
const unzip = require('unzip');
const readline = require('readline');

const asar = require('./asar');

// npm install readline, fs, request, url, child_process, unzip

const app = electron.app
const BrowserWindow = electron.BrowserWindow
var fileurl = 'https://github.com/Jiiks/BetterDiscordApp/archive/stable16.zip';
var basedir = `${process.env.HOME}/Library/Application Support/discord`
var version = fs.readdirSync(basedir).filter(f => fs.lstatSync(basedir + "/" + f).isDirectory() && f.split(".").length > 1).sort().reverse()[0];
var discordpath = `${basedir}/${version}/modules/discord_desktop_core/`;
var a = new asar(discordpath+'core.asar');
var discordexec = "/Applications/Discord.app"
let mainWindow





function createWindow () {
  mainWindow = new BrowserWindow({
    title:"BetterDiscord OSX Installer by den",
    resizable: false,icon: __dirname + '/images/betterdiscord_icon.png',
    width: 800, height: 600}
    );

  mainWindow.setMenu(null);
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  app.quit();
})

app.on('activate', function () {
  if (mainWindow === null) { createWindow(); }
})














// IPC Pipeline between main.js and index.html



ipc.on('openWebsite', function (event) {
  //exec('open https://betterdiscord.net');
  exec('open https://betterdiscord.net')
});




ipc.on('closeDiscord', function (event,data){
  exec('killall -SIGKILL Discord');
  event.sender.send('discordClosed',true);
});


ipc.on('appChecker', function (event, data){
  if (fs.existsSync(discordpath+'core')) {
    try {
      (execSync('rm -rf "'+discordpath+'core"'))
      event.sender.send('appChecked', true);
      console.log('deleted core folder');
    } catch (err) {
      console.log('failed to delete core file');
      event.sender.send('appChecked', false);
    }
  } else {
    event.sender.send('appChecked', true);
      console.log('No core folder found');
  }
});
ipc.on('startAsar', function (event, data){
    setTimeout(function() { appAsarExtract(event) }, 1500);
});

ipc.on('downloadZip', function (event){
    setTimeout(function() { downloadZipfile(fileurl, event)}, 1500);
});

ipc.on('injectJS', function (event){
    setTimeout(function() {injectBD(event)}, 1500);
});

ipc.on('relaunchDiscord', function (event){
    setTimeout(function() {relaunchDiscord(event)}, 1500);
    console.log('relaunching discord')
});















// Functions used by installer






function appAsarExtract(event){
  a.extract(msg => { 
    console.log(msg);
  },
  (curIndex, total) => {
  }, err => {
      if(err === null) {
        console.log("Extraction complete")
        event.sender.send('asarComplete', true);
      } else {
        console.log(err)
        event.sender.send('asarComplete', false);
      }
  });
}


function downloadZipfile(fileurl, event){
  request(fileurl)
  .pipe(fs.createWriteStream('/tmp/stable16.zip'))
  .on('close', function () {
    console.log('BetterDiscord modules saved to /tmp/stable16.zip');
    fs.createReadStream('/tmp/stable16.zip').pipe(unzip.Extract({ path: discordpath+"core/app/node_modules/" }).on('close', function(){
      console.log('moving to node_modules and renaming to betterdiscord')
	  if (fs.existsSync(discordpath+"core/app/node_modules/betterdiscord")) {
		  execSync('rmdir "' + discordpath+'core/app/node_modules/betterdiscord"');
	  }
      fs.rename(discordpath+"core/app/node_modules/BetterDiscordApp-stable16", discordpath+"core/app/node_modules/betterdiscord", function (err) {
        if (err) {
          throw err;
          console.log('Error thrown during file move');
          event.sender.send('zipComplete', false);
        } else {
          console.log('renamed BetterDiscordApp-stable16 to betterdiscord');
          event.sender.send('zipComplete', true);
        }
      });
    }));
  });
}

function injectBD(event){
	fs.writeFileSync(discordpath+'index.js', "module.exports = require('./core');");
		var lines = [];
		var linereader = readline.createInterface({input: fs.createReadStream(discordpath+'core/app/mainScreen.js')});
    try {
      linereader.on('line', line => {
        lines.push(line);
        if(line.indexOf("'use strict';") > -1) { 
          lines.push("var _betterDiscord = require('betterdiscord');");
          lines.push("var _betterDiscord2;");
        }

        if(line.indexOf("mainWindow = new") > -1) { 
          lines.push('    _betterDiscord2 = new _betterDiscord.BetterDiscord(mainWindow, false);');
        }
      });
      linereader.on('close', () => {
        fs.writeFileSync(discordpath+'core/app/mainScreen.js', lines.join('\n'));
        event.sender.send('injectComplete',true);
      });
    } catch (err){
      console.log("Error injecting BetterDiscord Code.")
      event.sender.send('injectComplete',false);
    }
}

function relaunchDiscord(event){
  try {
    console.log('relaunching discord');
    exec('open '+discordexec);
    console.log('discord launched');
    event.sender.send('relaunchComplete',true);
  } catch (err) {
    console.log('error relaunching discord');
    console.log(err);
    event.sender.send('relaunchComplete',false);
  }
}