import axios from "axios";
import { getSeason } from "./utils";

const getTrending = async (popular = false, page: string) => {
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
  const [season, year] = getSeason();
  const variables = {
    s: season,
    y: year,
    p: parseInt(page),
    sort: popular ? ["POPULARITY_DESC"] : ["TRENDING_DESC"]
  };
  try {
    const response = await axios.post("https://graphql.anilist.co", {
      query: query,
      variables: variables,
    });
    return response.data.data.Page.media;
  } catch (error) {
    console.log(error)
    throw new Error(`Error occurred while fetching trending anime: ${error}`);
  }
};

const getAnimeDetails = async (animeTitle: string) => {
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
    const response = await axios.post("https://graphql.anilist.co", {
      query: query,
      variables: variables,
    });
    return response.data.data.Media;
  } catch (error) {
    return null
  }
};

export { getTrending, getAnimeDetails };
