let express = require('express');
let app = express();
let path = require('path');
let bodyParser = require('body-parser');
let request = require('request');
let QueryString = require('qs');

require('dotenv').config();

const PORT = 3020;
//TODO: get from .env file
const client_id = process.env.CLIENT_ID; 
const client_secret = process.env.CLIENT_SECRET; 
const redirect_uri = `http://mooselliot.com:${PORT}/callback`
// const domain = `http://localhost:${PORT}`;
// const redirect_uri = `${domain}/callback`

console.log(`retrieved .env values: ${client_id} ${client_secret}`);

app.use(express.static(path.join(__dirname, 'build')));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.post('/api/search', function (req, res) {
  let accessToken = req.body.accessToken;
  let searchQuery = req.body.searchQuery;

  let query = QueryString.stringify({
    q: searchQuery,
    type: "track",
    limit: 8
  });

  let url = 'https://api.spotify.com/v1/search?' + query;
  let reqOptions = {
    url,
    headers: { 'Authorization': 'Bearer ' + accessToken },
    json: true
  };

  request.get(reqOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      res.send(body);
    } else {
      console.log(response);
      res.send({ error });
    }
  });
});

app.post('/api/build', function (req, res) {
  let accessToken = req.body.accessToken;
  let userId = req.body.userId;
  let playlistTitle = req.body.playlistTitle;
  let trackIds = req.body.trackIds;

  let url = `https://api.spotify.com/v1/users/${userId}/playlists`;
  let reqOptions = {
      url,
      headers: { 'Authorization': 'Bearer ' + accessToken },
      body: {
          name: playlistTitle || "Untitled (Playlist Builder)"
      },
      json: true
  };

  request.post(reqOptions, function (error, response, body) {
      if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
          // resolve(body);
          let playlist_id = body.id;
          
          let url = `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`;
          let reqOptions = {
              url,
              headers: { 'Authorization': 'Bearer ' + accessToken },
              body: {
                  uris : trackIds.map((id)=>`spotify:track:${id}`)
              },
              json: true
          };
          
          request.post(reqOptions, function (error, response, addBody) {
              if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
                  res.send(body);                                        
              } else {
                  console.log(response);
                  res.send({error});
              }
          });
  

      } else {
          console.log(response);
          res.send({error});
      }
  });
});

app.post('/api/getUser', function (req, res) {
  let accessToken = req.body.accessToken;
  var options = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + accessToken },
    json: true
  };

  request.get(options, function (error, response, body) {
    if (error) {
      console.log(error);
      res.send({error});
      return;
    }

    res.send(body);
  });
});

app.post('/api/getAccessToken', function (req, res) {
  let code = req.body.code;
  console.log(redirect_uri);
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    json: true
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      // console.log(`Found access token: ${body.access_token}`);
      res.send(body.access_token);
    } else {
      // console.log('access token retrieval failed')
      // console.log(response.statusCode);
      // console.log(response);
      res.send({ error });
    }
  });
});

app.listen(PORT, ()=> console.log(`Server started on port: ${PORT}`));