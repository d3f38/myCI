const config = require('./config') ;
const fs = require("fs");
const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');

app.use(express.json());
app.use(cors());

app.get('/', function(req, res) {
    res.sendFile('index.html', { root: './src' });
});

app.get('/build/:buildId', function(req, res) {

    res.sendFile(`${req.params.buildId}.html`, { root: './build_results' });
});

app.post('/notify_agent', (req, res) => {
    res.send(config)
})

app.post('/notify_build_result', (req, res) => {
    fs.writeFileSync(`build_results/${req.body.buildId}-${req.body.status}.html`, req.body.html)
    // res.send('Hello World!')
})

app.get('/get_list_results', (req, res) => {
    fs.readdir('./build_results', {
        "withFileTypes": true
    }, (err, files) => {
        let result = '';
        const listResults = files.map((file) => file.name.replace('.html', ''));

        listResults.forEach(item => {
            return result += `<tr>
                <td><a href="/build/${item}">${item.split('-')[0]}</a></td>
                <td>${item.split('-')[1]}</td>
            </tr>`
        });

        res.send(result);
    }, '');
});

app.get('/get_result', (req, res) => {
    fs.readFile("hello.txt", "utf8", 
        function(error,data){
            if(error) throw error; 
            res.send(data)
    });
})

app.listen(3000, () => console.log(`Example app listening on port ${port}!`))