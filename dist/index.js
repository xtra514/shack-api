m"use strict";

var __awaiter =

  (this && this.__awaiter) ||

  function (thisArg, _arguments, P, generator) {

    function adopt(value) {

      return value instanceof P

        ? value

        : new P(function (resolve) {

            resolve(value);

          });

    }

    return new (P || (P = Promise))(function (resolve, reject) {

      function fulfilled(value) {

        try {

          step(generator.next(value));

        } catch (e) {

          reject(e);

        }

      }

      function rejected(value) {

        try {

          step(generator["throw"](value));

        } catch (e) {

          reject(e);

        }

      }

      function step(result) {

        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);

      }

      step((generator = generator.apply(thisArg, _arguments || [])).next());

    });

  };

var __importDefault =

  (this && this.__importDefault) ||

  function (mod) {

    return mod && mod.__esModule ? mod : { default: mod };

  };

Object.defineProperty(exports, "__esModule", { value: true });

const express_1 = __importDefault(require("express"));

const axios_1 = __importDefault(require("axios"));

const cors_1 = __importDefault(require("cors"));

const cheerio_1 = require("cheerio");

const utils_1 = require("./utils");

const anilist_1 = require("./anilist");

const app = express_1.default();

app.use(cors_1.default());

const baseUrl = "https://gogoanime.gr";

const apiUrl = "https://ajax.gogo-load.com/ajax";

app.get("/", (req, res) => {

  res.send("Hello, world!");

});

app.get("/anime/:name", (req, res) =>

  __awaiter(void 0, void 0, void 0, function* () {

    let name = req.params.name;

    var isDub = false;

    try {

      const resp = yield axios_1.default.get(`${baseUrl}/category/${name}`);

      const $ = cheerio_1.load(resp.data);

      const id = $('input#movie_id').attr('value');

      const episodes = yield utils_1.getEpisodes(id);

      if (name.includes("dub")) {

        isDub = true;

        name = name.replace("-dub", "");

      }

      var animeDetails = yield anilist_1.getAnimeDetails(name);

      if (!animeDetails) {

        if (episodes.length !== 0) {

          animeDetails = utils_1.getAnimeInfo($);

        } else {

          throw new Error("Anime not found");

        }

      }

      if (!isDub) {

        axios_1.default

          .head(`${baseUrl}/category/${name}-dub`)

          .then((response) => {

            if (response.status === 200) {

              isDub = true;

            }

            res.send({

              status: 200,

              data: {

                ...animeDetails,

                episode: episodes,

                isDub: isDub,

              },

            });

          })

          .catch((error) => {

            if (error.response.status === 404) {

              isDub = false;

              res.send({

                status: 200,

                data: {

                  ...animeDetails,

                  episode: episodes,

                  isDub: isDub,

                },

              });

            } else {

              throw error;

            }

          });

      } else {

        res.send({

          status: 200,

          data: {

            ...animeDetails,

            episode: episodes,

            isDub: isDub,

          },

        });

      }

    } catch (error) {

      res.status(404).send({ status: 404, data: error.message });

    }

  })

);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(`Server listening on port ${PORT}`);

});


