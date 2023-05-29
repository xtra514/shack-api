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
exports.getAnimeDetails = exports.getTrending = void 0;
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("./utils");

const getTrending = async (popular = false, page) => {
  const query = `
    query($s: MediaSeason, $y: Int, $p: Int, $sort: [MediaSort]) {
      Page(page: $p, perPage: 12) {
        media(season: $s, seasonYear: $y, sort: $sort) {
          idMal
          title {
            romaji
            english
            native
          }
          format
          genres
          episodes
          bannerImage
          coverImage {
            large
          }
          type
          status
          description
        }
      }
    }
  `;

  const [season, year] = utils_1.getSeason();
  const variables = {
    s: season,
    y: year,
    p: parseInt(page),
    sort: popular ? ["POPULARITY_DESC"] : ["TRENDING_DESC"]
  };

  try {
    const response = await axios_1.default.post("https://graphql.anilist.co", {
      query: query,
      variables: variables,
    });

    // Filter out hentai genre
    const trendingAnime = response.data.data.Page.media.filter(
      (anime) => !anime.genres.includes("Hentai")
    );

    return trendingAnime;
  } catch (error) {
    console.log(error);
    throw new Error(`Error occurred while fetching trending anime: ${error}`);
  }
};

exports.getTrending = getTrending;

const getAnimeDetails = async (animeTitle) => {
  const query = `
    query ($id: Int, $idMal: Int, $search: String) {
      Media(id: $id, idMal: $idMal, search: $search, type: ANIME) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        format
        status
        episodes
        seasonYear
        season
        description
        bannerImage
        coverImage {
          large
        }
        genres
        averageScore
      }
    }
  `;

  const variables = { search: animeTitle };

  try {
    const response = await axios_1.default.post("https://graphql.anilist.co", {
      query: query,
      variables: variables,
    });

    return response.data.data.Media;
  } catch (error) {
    return null;
  }
};

exports.getAnimeDetails = getAnimeDetails;
