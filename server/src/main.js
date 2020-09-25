const { app, BrowserWindow } = require("electron");
const express = require("express");
const cors = require('cors');
const fs = require('fs');

const googlePeopleBot = require('./robots/google-people');

app.on("ready", function () {
  var server = express();
  
  server.use(cors());

  var mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
    show: false
  });

  server.get("/google-people", async (req, res) => {
    await googlePeopleBot();

    fs.readFile('contacts.json', (err, content) => {
      res.send(JSON.parse(content));
    });

  });

  server.get("/whatsapp/:number/:message", async (req, res) => {
    var { number, message } = req.params;

    await send(number, message);

    res.send({message: "Enviando menssagem..."});
  });
  
  function send(number, message) {
    mainWindow.loadURL(
      `https://web.whatsapp.com/send?phone=${number}&text=${message}`,
      {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36",
      }
    );
    mainWindow.webContents.executeJavaScript(
      `
      var{ipcRenderer,remote} = require("electron");
      var enviado = false;
      function tempo(){
        var btsend = document.getElementsByClassName("_1U1xa")[0];
        var inputSend = document.getElementsByClassName("_3FRCZ")[1];
        console.log(inputSend);
        if(typeof inputSend !== "undefined" && inputSend.innerText && !enviado){
          btsend.click();enviado=true;}
        else if(enviado){
            ipcRenderer.send("para", {status:true});
        }}
        setInterval(tempo,3000);
      `
    );
    
    mainWindow.show();
  }

  server.listen(5104);
});
