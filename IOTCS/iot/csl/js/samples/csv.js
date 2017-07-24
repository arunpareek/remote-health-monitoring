var fs = require('fs'); 
var parse = require('csv-parse');

var csvData=[];
fs.createReadStream('myfile.csv')
    .pipe(parse({delimiter: ':'}))
    .on('data', function(csvrow) {
        csvData.push(csvrow);        
    })
    .on('end',function() {
      //do something wiht csvData
      console.log(csvData);
    });