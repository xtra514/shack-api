import express, { Express } from 'express';
import axios from 'axios';
import cors from 'cors';
import { load } from "cheerio";
import { extract, getAnimeInfo, getEpisodes } from './utils';
import { getAnimeDetails, getTrending } from "./anilist";


const app: Express = express();
app.use(cors())

const baseUrl: string = "https://gogoanime.gr";
const apiUrl: string = "https://ajax.gogo-load.com/ajax"


app.get('/', (req, res) => {
    res.send('Hello, SHACKERS');
});


app.get('/anime/:name', async (req, res) => {
    let name: string = req.params.name;
    var isDub = false;

    try {
        const resp = await axios.get(`${baseUrl}/category/${name}`);

        const $ = load(resp.data);
        const id = $('input#movie_id').attr('value')!;
        const episodes = await getEpisodes(id);

        if (name.includes('dub')) {
            isDub = true;
            name = name.replace('-dub', '');
        }

        var animeDetails = await getAnimeDetails(name);
        if (!animeDetails) {
            if (episodes.length !== 0) {
                animeDetails = getAnimeInfo($);
            } else {
                throw new Error('Anime not found');
            }
        }

        if (!isDub) {
            axios.head(`${baseUrl}/category/${name}-dub`)
                .then((response) => {
                    if (response.status === 200) {
                        isDub = true;
                    }

                    res.send({
                        status: 200,
                        data: { ...animeDetails, episode: episodes, isDub: isDub },
                    });
                })
                .catch((error) => {
                    if (error.response.status === 404) {
                        isDub = false;

                        res.send({
                            status: 200,
                            data: { ...animeDetails, episode: episodes, isDub: isDub },
                        });
                    } else {
                        throw error;
                    }
                });
        } else {
            res.send({
                status: 200,
                data: { ...animeDetails, episode: episodes, isDub: isDub },
            });
        }
    } catch (error: any) {
        res.status(404).send({ status: 404, data: error.message });
    }
});



app.get('/api/recent/:page', async (req, res) => {
    const page: string = req.params.page;
    const type = req.query.type || '1';

    const response = await axios.get(`${apiUrl}/page-recent-release.html?page=${page}&type=${type}`);
    const $ = load(response.data);

    const results: any = [];
    const items = $('ul.items').find('li');

    items.slice(0, 12).each(function (_, item) {
        const animeTitle = $(item).find('p.name a').attr('title');
        const animeUrl = $(item).find('a').attr('href');
        const animeImage = $(item).find('img').attr('src');
        const episode = +$(item).find('p.episode').text().replace('Episode ', '')

        results.push({
            title: animeTitle,
            image: animeImage,
            language: type,
            url: animeUrl,
            episode: episode
        })
    });

    res.send({ status: 200, count: results.length, data: results })

});


app.get('/stream/:slug', async (req, res) => {
    const slug = req.params.slug;

    try {
        const response = await axios.get(`${baseUrl}/${slug}`);
        const $ = load(response.data);
        const title = $('.title_name h2').text()
        const id = $('input#movie_id').attr('value')!
        const episodes = await getEpisodes(id);
        const items = $('div.anime_muti_link ul').find('li');
        const streamableUrls: any = []

        items.each(function (_, item) {
            const url = $(item).find('a').attr('data-video');
            streamableUrls.push(url?.startsWith('//') ? url.replace('//', 'https://') : url)
        });

        const downloadLink = streamableUrls[0]?.replace('streaming.php', 'download')

        streamableUrls[0] = await extract(streamableUrls[0])
        streamableUrls[1] = await extract(streamableUrls[1])

        const data = {
            title: title,
            stream: streamableUrls,
            download: downloadLink,
            episodes: episodes,
            totalEpisodes: episodes.length
        }

        res.send({ status: 200, data: data })
    } catch (error) {
        res.send({ status: 400, error: error })
    }
})


app.get('/search/:query', async (req, res) => {
    const query: string = req.params.query;

    try {
        const response = await axios.get(`${baseUrl}/search.html?keyword=${query}`)

        const $ = load(response.data);
        const items = $('ul.items').find('li');
        const searchResults: any = []

        items.each(function (_, item) {
            const animeTitle = $(item).find('p.name a').attr('title');
            const animeUrl = $(item).find('a').attr('href');
            const animeImage = $(item).find('img').attr('src');
            searchResults.push({ title: animeTitle, image: animeImage, url: animeUrl })
        });

        res.send({ status: 200, count: searchResults.length, results: searchResults })
    } catch (error) {
        res.send({ status: 400, error: error })
    }
})


app.get('/api/trending/:page', async (req, res) => {
    const page: string = req.params.page;

    try {
        const trendingAnimes = await getTrending(false, page);
        res.send({ status: 200, data: trendingAnimes });
    } catch (err) {
        console.error(`Error getting trending anime: ${err}`);
        res.status(500).send({ status: 500, message: 'Internal server error' });
    }
});

app.get('/api/popular/:page', async (req, res) => {
    const page: string = req.params.page;

    try {
        const popularAnimes = await getTrending(true, page);
        res.send({ status: 200, data: popularAnimes });
    } catch (err) {
        console.error(`Error getting popular anime: ${err}`);
        res.status(500).send({ status: 500, message: 'Internal server error' });
    }
});


app.listen(process.env.port || 3000, () => {
    console.log('Server listening on port 3000!');
});
