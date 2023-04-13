import axios from "axios";
import { load } from "cheerio";
import crypto from 'crypto';
import { URL } from 'url';


const getEncryptedData = async (url: string) => {
    const response = await axios.get(url);
    const $ = load(response.data);
    const encryptedData = $('script[data-name="episode"]').attr('data-value')
    return encryptedData
}


const pad = (urlId: string) => {
    const paddingLength = 16 - (urlId.length % 16);
    const paddingChar = String.fromCharCode(paddingLength);
    return urlId + paddingChar.repeat(paddingLength);
}


const decrypt = (key: Buffer, iv: Buffer, encryptedData: string) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decryptedData = decipher.update(Buffer.from(encryptedData, 'base64'));
    decryptedData = Buffer.concat([decryptedData, decipher.final()]);
    return decryptedData
}


const extract = async (url: string) => {
    const encryptionKey = Buffer.from('37911490979715163134003223491201');
    const decryptionKey = Buffer.from('54674138327930866480207815084989');
    const iv = Buffer.from('3134003223491201');

    const encryptedData = await getEncryptedData(url)
    const decryptedData = decrypt(encryptionKey, iv, encryptedData!)

    const ampersandIndex = decryptedData.indexOf('&');
    const newId = decryptedData.slice(ampersandIndex).toString('binary')
        .replace(/[\x00-\x10]/g, '');

    const pUrl = new URL(url);
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(pad(pUrl.searchParams.get('id')!)), cipher.final()]);
    const encryptedAjax = encrypted.toString('base64');

    const ajaxUrl = `https://${pUrl.host}/encrypt-ajax.php`
    const resp = await axios.get(`${ajaxUrl}?id=${encryptedAjax.toString()}${newId}&alias=${pUrl.searchParams.get('id')}`, {
        headers: {
            'x-requested-with': 'XMLHttpRequest'
        }
    })

    const data = decrypt(decryptionKey, iv, resp.data.data.replace(/[\x00-\x10]/g, ''))
    const jsonData = JSON.parse(data.toString());
    return jsonData.source[0].file
}


const getSeason = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    let year = now.getFullYear();
    let season;

    if ([1, 2, 12].includes(month)) {
        season = "WINTER";
        if (month === 12) {
            year += 1;
        }
    } else if ([3, 4, 5].includes(month)) {
        season = "SPRING";
    } else if ([6, 7, 8].includes(month)) {
        season = "SUMMER";
    } else if ([9, 10, 11].includes(month)) {
        season = "FALL";
    }
    return [season, year];
}

const getEpisodes = async (id: string) => {
    try {
        const response = await axios.get(`https://ajax.gogo-load.com/ajax/load-list-episode?ep_start=0&ep_end=9999&id=${id}`);
        const $ = load(response.data);

        const items = $('ul#episode_related').find('li');
        const episodes: any = []

        items.each((_, item) => {
            episodes.push({
                episode: $(item).find('div.name').text().replace('EP ', ''),
                episodeUrl: $(item).find('a').attr('href'),
            })
        })

        return episodes
    } catch (error) {
        return []
    }
}


const getAnimeInfo = ($: any) => {
    const title = $('h1').text()
    const animeDetails = {
        title: { romaji: title, english: title, native: title },
        description: $('p:contains(Plot Summary)').text().replace('Plot Summary:', '').trim(),
        status: $('p:contains(Status)').text().replace('Status:', '').trim(),
        seasonYear: $('p:contains(Released)').text().replace('Released:', '').trim(),
        genres: $('p:contains(Genre)').text().replace('Genre:', '').split(','),
        coverImage: { large: $('div.anime_info_body_bg img').attr('src') }
    }

    return animeDetails
}


export { extract, getSeason, getEpisodes, getAnimeInfo };
