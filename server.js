const fetch = require('node-fetch');
const express = require('express');
const app = express();
const path = require('path');
const countries = require("./countries.js");
const { profile } = require('console');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));

const baseUrl = 'https://transfermarkt-api.fly.dev/players';

app.get('/', (req, res) => {
  res.render('menu');
});

app.post('/search', async (req, res) => {
  const playerName = req.body.playerName;
  const page = Number(req.body.page) || 1;

  res.redirect(`/search?playerName=${encodeURIComponent(playerName)}&page=${page}`);
});


app.get('/search', async (req, res) => {
  const playerName = req.query.playerName;
  const page = Number(req.query.page) || 1;

  try {
    const response = await fetch(`${baseUrl}/search/${encodeURIComponent(playerName)}?page_number=${page}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const lastPageNumber = data.lastPageNumber || 1;

      if (page > lastPageNumber) {
        return res.redirect(`/search?playerName=${encodeURIComponent(playerName)}&page=${lastPageNumber}`);
      }

      if(page < 1) {
        return res.redirect(`/search?playerName=${encodeURIComponent(playerName)}&page=1`);
      }

      let playersWithImages = await Promise.all(
        data.results.map(async (player) => {
          try {
            const profileResponse = await fetch(`${baseUrl}/${player.id}/profile`, {
              method: 'GET',
              headers: { accept: 'application/json' },
            });

            if (!profileResponse.ok) throw new Error('Profil verisi alınamadı');

            const profileData = await profileResponse.json();

            return {
              ...player,
              photoUrl: profileData.imageUrl || 'https://img.a.transfermarkt.technology/portrait/header/default.jpg?lm=1',
              agent: profileData.agent.name || "-",
            };
          } catch (error) {
            return null;
          }
        })
      );

      playersWithImages = playersWithImages.filter(player => player !== null);
      res.render('players', {
        players: playersWithImages,
        playerName,
        currentPage: page,
        lastPageNumber,
        countries,
      });
    } else {
      res.render('players', {
        players: [],
        playerName,
        currentPage: page,
        lastPageNumber: 1,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.send('Bir hata oluştu!');
  }
});

app.get('/:id', async (req, res) => {
  const playerId = req.params.id;
  const profileUrl = `${baseUrl}/${playerId}/profile`;

  try {
    const response = await fetch(profileUrl, { method: 'GET', headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('Profil verisi alınamadı');

    const profileData = await response.json();

    res.render('index', {
      description: profileData.description,
      name: profileData.name,
      position: profileData.position.main,
      club: profileData.club.name,
      clubid: profileData.club.id,
      age: profileData.age,
      citizenship: profileData.citizenship,
      marketValue: profileData.marketValue,
      agent: profileData.agent?.name,
      city: profileData.placeOfBirth.city,
      country: profileData.placeOfBirth.country,
      shirtNumber: profileData.shirtNumber,
      dateOfBirth: profileData.dateOfBirth,
      height: profileData.height,
      photoUrl: profileData.imageUrl || 'https://img.a.transfermarkt.technology/portrait/header/default.jpg?lm=1',
    });
  } catch (error) {
    console.error('Error:', error);
    res.send('Bir hata oluştu!');
  }
});

console.warn = console.error = console.info = function () {};

app.listen(3000, () => console.log('⚜️  Server running now on http://localhost:3000'));