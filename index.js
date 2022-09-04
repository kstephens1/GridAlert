var appConfig = require('./config').keys;
var request = require('request');
const fs = require("fs");

var options = {
    uri: 'https://director.myenergi.net/cgi-jstatus-Z',
    auth: {
      user: appConfig.MYENERGI_USERNAME,
      pass: appConfig.MYENERGI_PASSWORD,
      sendImmediately: false
    }
  };


  request(options, function(error, response, body){//Use Reqeust Module with above options
    if (!error && response.statusCode == 200){
        let json = JSON.parse(body);//parse javascipt object into json obect
        //console.log(json)
        console.log("House Load ?: " + (json.zappi[0].ectp2)/1000 + "kW");
        console.log("Solar Gen : " + (json.zappi[0].gen)/1000 + "kW");
        console.log("From Grid : " + (json.zappi[0].grd)/1000 + "kW");

    var GridLoad = json.zappi[0].grd/1000;

    LogReading(GridLoad);

    if (GridLoad <= -1.3){
      console.log("Send Notification, Grid Load =  " + GridLoad);
      //SendNotification(GridLoad);
    }

    }
    else{//error trap
        console.log('Code : ' + response.statusCode)
        console.log('error : ' + error)
        console.log('body : ' + body)
    }
});

async function SendNotification(Message) {
  //var Message = "Exporting: " + Load * -1 + " kW";
//  PushOver(Message);
}

async function PushOver(Message){
  console.log("Pushover func: " + Message);
    var RequestOptions = {
    uri: 'https://api.pushover.net/1/messages.json?token=afucc3zbdod32hh3tid4opo2ne8hos&user=uwnw7fc2dh6ekkbdurbzdrrd1d9ddf&message=' + Message,
    method: 'POST'
  };

  request(RequestOptions, function(error, response, body){//Use Request Module with above options
    if (!error && response.statusCode == 200){
        let json = JSON.parse(body);//parse javascipt object into json obect
//        console.log(json)
    }
    else{//error trap
        console.log('Code : ' + response.statusCode)
        console.log('error : ' + error)
        console.log('body : ' + body)
    }
});
}

function LogReading(GridLoadReading){
//check if file exist
if (!fs.existsSync('log.json')) {
  //create new file if not exist
  fs.closeSync(fs.openSync('log.json', 'w'));
}

// read file
const file = fs.readFileSync('log.json')

//date setup
var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);

//log json structure with array markers for start new file mode
const newdata = [
  {
    Time: localISOTime,
    Gridload: GridLoadReading
  }
];

//without array markers for append to existing file mode
const newdata1 = 
  {
    Time: localISOTime,
    Gridload: GridLoadReading
  }
;

//check if file is empty
if (file.length == 0) {
  //add data to json file
  console.log("not appending to file, I am writing to file  Here");
  //fs.writeFileSync("log.json", JSON.stringify([data]))
  fs.writeFileSync('log.json', JSON.stringify(newdata), function(err) {
    if (err) throw err; 
});
} else {//file not empty
  console.log("Appending to file Here");
  fs.readFile('log.json', function (err, data) {
    if(data === '') {//no data
        console.log('=== Here');
        json = JSON.parse(newdata1);
        json.push(newdata);
        fs.writeFile("log.json", JSON.stringify(json));
      }
      else{
        console.log("There is data in file");
        const json = JSON.parse(file.toString())
        //console.log("json val = " + JSON.stringify(json));
        //reader = JSON.stringify(json);
        //console.log('Reader = ' + json[0].toString());
        // LogLength =  json.length;
        // console.log('Last entry  = ' + json[LogLength -1]["Gridload"]);
        ReadGenHistory(json, GridLoadReading);

        json.push(newdata1);
        fs.writeFile('log.json', JSON.stringify(json), function(err) {
          if (err) throw err; 
      });
      }
 
  })

function ReadGenHistory(tjson, tGridLoad){
  surplusThreshold = 0.01
  LogLength =  tjson.length;
  console.log('3nd to last entry  = ' + tjson[LogLength -3]["Gridload"]);
  console.log('2nd to last entry  = ' + tjson[LogLength -2]["Gridload"]);
  console.log('Last entry  = ' + tjson[LogLength -1]["Gridload"]);
  console.log("Current Reading : " + tGridLoad );

  AverageReading = ((tjson[LogLength -3]["Gridload"] + tjson[LogLength -2]["Gridload"] + tjson[LogLength -1]["Gridload"] + tGridLoad)/4).toFixed(2);

  if(tjson[LogLength -3]["Gridload"] > surplusThreshold && tjson[LogLength -2]["Gridload"] > surplusThreshold && tjson[LogLength -1]["Gridload"] > surplusThreshold && tGridLoad >surplusThreshold){
    console.log("15 min historic surplus averaging "+ AverageReading + "kWH");
    SendNotification("15 min historic surplus averaging "+ AverageReading + "kWH. Current Export = "+ tGridLoad + "kWH");
  }

}


}}