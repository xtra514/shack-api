"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const cheerio_1 = require("cheerio");
const utils_1 = require("./utils");
const anilist_1 = require("./anilist");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const baseUrl = "https://gogoanime.gr";
const apiUrl = "https://ajax.gogo-load.com/ajax";
app.get('/', (req, res) => {
    res.send('Hello, world!');
});
app.get('/anime/:name', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let name = req.params.name;
    var isDub = false;
    try {
        const resp = yield axios_1.default.get(`${baseUrl}/category/${name}`);
        const $ = (0, cheerio_1.load)(resp.data);
        const id = $('input#movie_id').attr('value');
        const episodes = yield (0, utils_1.getEpisodes)(id);
        if (name.includes('dub')) {
            isDub = true;
            name = name.replace('-dub', '');
        }
        var animeDetails = yield (0, anilist_1.getAnimeDetails)(name);
        if (!animeDetails) {
            if (episodes.length !== 0) {
                animeDetails = (0, utils_1.getAnimeInfo)($);
            }
            else {
                throw new Error('Anime not found');
            }
        }
        if (!isDub) {
            axios_1.default.head(`${baseUrl}/category/${name}-dub`)
                .then((response) => {
                if (response.status === 200) {
                    isDub = true;
                }
                res.send({
                    status: 200,
                    data: Object.assign(Object.assign({}, animeDetails), { episode: episodes, isDub: isDub }),
                });
            })
                .catch((error) => {
                if (error.response.status === 404) {
                    isDub = false;
                    res.send({
                        status: 200,
                        data: Object.assign(Object.assign({}, animeDetails), { episode: episodes, isDub: isDub }),
                    });
                }
                else {
                    throw error;
                }
            });
        }
        else {
            res.send({
                status: 200,
                data: Object.assign(Object.assign({}, animeDetails), { episode: episodes, isDub: isDub }),
            });
        }
    }
    catch (error) {
        res.status(404).send({ status: 404, data: error.message });
    }
}));
app.get('/api/recent/:page', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = req.params.page;
    const type = req.query.type || '1';
    const response = yield axios_1.default.get(`${apiUrl}/page-recent-release.html?page=${page}&type=${type}`);
    const $ = (0, cheerio_1.load)(response.data);
    const results = [];
    const items = $('ul.items').find('li');
    items.slice(0, 12).each(function (_, item) {
        const animeTitle = $(item).find('p.name a').attr('title');
        const animeUrl = $(item).find('a').attr('href');
        const animeImage = $(item).find('img').attr('src');
        const episode = +$(item).find('p.episode').text().replace('Episode ', '');
        results.push({
            title: animeTitle,
            image: animeImage,
            language: type,
            url: animeUrl,
            episode: episode
        });
    });
    res.send({ status: 200, count: results.length, data: results });
}));
app.get('/stream/:slug', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const slug = req.params.slug;
    try {
        const response = yield axios_1.default.get(`${baseUrl}/${slug}`);
        const $ = (0, cheerio_1.load)(response.data);
        const title = $('.title_name h2').text();
        const id = $('input#movie_id').attr('value');
        const episodes = yield (0, utils_1.getEpisodes)(id);
        const items = $('div.anime_muti_link ul').find('li');
        const streamableUrls = [];
        items.each(function (_, item) {
            const url = $(item).find('a').attr('data-video');
            streamableUrls.push((url === null || url === void 0 ? void 0 : url.startsWith('//')) ? url.replace('//', 'https://') : url);
        });
        const downloadLink = (_a = streamableUrls[0]) === null || _a === void 0 ? void 0 : _a.replace('streaming.php', 'download');
        streamableUrls[0] = yield (0, utils_1.extract)(streamableUrls[0]);
        streamableUrls[1] = yield (0, utils_1.extract)(streamableUrls[1]);
        const data = {
            title: title,
            stream: streamableUrls,
            download: downloadLink,
            episodes: episodes,
            totalEpisodes: episodes.length
        };
        res.send({ status: 200, data: data });
    }
    catch (error) {
        res.send({ status: 400, error: error });
    }
}));
app.get('/search/:query', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.params.query;
    try {
        const response = yield axios_1.default.get(`${baseUrl}/search.html?keyword=${query}`);
        const $ = (0, cheerio_1.load)(response.data);
        const items = $('ul.items').find('li');
        const searchResults = [];
        items.each(function (_, item) {
            const animeTitle = $(item).find('p.name a').attr('title');
            const animeUrl = $(item).find('a').attr('href');
            const animeImage = $(item).find('img').attr('src');
            searchResults.push({ title: animeTitle, image: animeImage, url: animeUrl });
        });
        res.send({ status: 200, count: searchResults.length, results: searchResults });
    }
    catch (error) {
        res.send({ status: 400, error: error });
    }
}));
app.get('/api/trending/:page', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = req.params.page;
    try {
        const trendingAnimes = yield (0, anilist_1.getTrending)(false, page);
        res.send({ status: 200, data: trendingAnimes });
    }
    catch (err) {
        console.error(`Error getting trending anime: ${err}`);
        res.status(500).send({ status: 500, message: 'Internal server error' });
    }
}));
app.get('/api/popular/:page', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = req.params.page;
    try {
        const popularAnimes = yield (0, anilist_1.getTrending)(true, page);
        res.send({ status: 200, data: popularAnimes });
    }
    catch (err) {
        console.error(`Error getting popular anime: ${err}`);
        res.status(500).send({ status: 500, message: 'Internal server error' });
    }
}));
app.listen(process.env.port || 3000, () => {
    console.log('Server listening on port 3000!');
});
