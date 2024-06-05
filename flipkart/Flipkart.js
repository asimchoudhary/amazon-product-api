// ts-nocheck
const rp = require('request-promise');
const { forEachLimit } = require('async');
const { writeFile } = require('fs');
const { fromCallback } = require('bluebird');
const cheerio = require('cheerio');
const ora = require('ora');
const spinner = ora('Flipkart Spinner Started');
const { Parser } = require('json2csv');
const moment = require('moment');
const { SocksProxyAgent } = require('socks-proxy-agent');

const CONST = require('./flipkartConstant');
const geo = CONST.geo.IN;

class FlipkartScrapper {
    constructor({
        keyword,
        number,
        sponsored,
        proxy,
        cli,
        filetype,
        scrapeType,
        fsin,
        sort,
        discount,
        rating,
        ua,
        timeout,
        randomUa,
        page,
        bulk,
        category,
        cookie,
        geo,
        asyncTasks,
        reviewFilter,
        referer,
    }) {
        this.asyncTasks = asyncTasks;
        this.asyncPage = 1;
        this.mainHost = `https://${geo.host}`;
        this.geo = geo;
        this.cookie = cookie;
        this.bulk = bulk;
        this.productSearchCategory = category;
        this.collector = [];
        this.keyword = keyword;
        this.number = parseInt(number, 10);
        this.searchPage = page;
        this.sponsored = sponsored;
        this.proxy = proxy;
        this.cli = cli;
        this.scrapeType = scrapeType;
        this.fsin = fsin;
        this.sort = sort;
        this.discount = discount;
        this.rating = rating;
        this.minRating = 1;
        this.maxRating = 5;
        this.timeout = timeout;
        this.randomUa = randomUa;
        this.totalProducts = 0;
        this.reviewMetadata = {
            total_reviews: 0,
            stars_stat: {},
        };
        this.referer = referer;
        this.fileType = filetype;
        this.jsonToCsv = new Parser({ flatten: true });
        this.initTime = Date.now();
        this.ua = ua || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.113 Safari/537.36';
        this.reviewFilter = reviewFilter;
    }
    get userAgent() {
        {
            const os = [
                'Macintosh; Intel Mac OS X 10_15_7',
                'Macintosh; Intel Mac OS X 10_15_5',
                'Macintosh; Intel Mac OS X 10_11_6',
                'Macintosh; Intel Mac OS X 10_6_6',
                'Macintosh; Intel Mac OS X 10_9_5',
                'Macintosh; Intel Mac OS X 10_10_5',
                'Macintosh; Intel Mac OS X 10_7_5',
                'Macintosh; Intel Mac OS X 10_11_3',
                'Macintosh; Intel Mac OS X 10_10_3',
                'Macintosh; Intel Mac OS X 10_6_8',
                'Macintosh; Intel Mac OS X 10_10_2',
                'Macintosh; Intel Mac OS X 10_10_3',
                'Macintosh; Intel Mac OS X 10_11_5',
                'Windows NT 10.0; Win64; x64',
                'Windows NT 10.0; WOW64',
                'Windows NT 10.0',
            ];

            return `Mozilla/5.0 (${os[Math.floor(Math.random() * os.length)]}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${
                Math.floor(Math.random() * 4) + 100
            }.0.${Math.floor(Math.random() * 190) + 4100}.${Math.floor(Math.random() * 50) + 140} Safari/537.36`;
        }
    }
    get getReferer() {
        if (Array.isArray(this.referer)) {
            return this.referer[Math.floor(Math.random() * this.referer.length)];
        }

        return '';
    }
    get getProxy() {
        const selectProxy = Array.isArray(this.proxy) && this.proxy.length ? this.proxy[Math.floor(Math.random() * this.proxy.length)] : '';
        if (selectProxy.indexOf('socks4://') > -1 || selectProxy.indexOf('socks5://') > -1) {
            return {
                socks: true,
                proxy: new SocksProxyAgent(selectProxy),
            };
        }
        return {
            socks: false,
            proxy: selectProxy,
        };
    }
    /**
     * Main request method
     * @param {*} param0
     */
    httpRequest({ uri, method, qs, json, body, form }) {
        const proxy = this.getProxy;
        return new Promise(async (resolve, reject) => {
            const options = {
                uri: uri ? `${this.mainHost}/${uri}` : this.mainHost,
                method,
                ...(qs ? { qs } : {}),
                ...(body ? { body } : {}),
                ...(form ? { form } : {}),
                headers: {
                    'user-agent': this.userAgent,
                    cookie: this.cookie,
                    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'accept-language': 'en-US,en;q=0.9,ru;q=0.8',
                    ...(this.getReferer ? { referer: this.getReferer } : {}),
                    ...(Math.round(Math.random()) ? { downlink: Math.floor(Math.random() * 30) + 10 } : {}),
                    ...(Math.round(Math.random()) ? { rtt: Math.floor(Math.random() * 100) + 50 } : {}),
                    ...(Math.round(Math.random()) ? { pragma: 'no-cache' } : {}),
                    ...(Math.round(Math.random()) ? { ect: '4g' } : {}),
                    ...(Math.round(Math.random()) ? { DNT: 1 } : {}),
                    'device-memory': `${Math.floor(Math.random() * 16) + 8}`,
                    'viewport-width': `${Math.floor(Math.random() * 2100) + 1200}`,
                },
                strictSSL: false,
                ...(json ? { json: true } : {}),
                gzip: true,
                resolveWithFullResponse: true,
                ...(proxy.proxy && proxy.socks ? { agent: proxy.proxy } : {}),
                ...(proxy.proxy && !proxy.socks ? { proxy: `http://${proxy.proxy}/` } : {}),
            };
            const flipkartUrl = options.uri + '?' + new URLSearchParams(options.qs).toString();

            try {
                const response = await rp(flipkartUrl);
                setTimeout(() => {
                    resolve(response);
                }, this.timeout);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Start scraper
     */

    async startScraper() {
        if (this.scrapeType === 'products') {
            this.asyncPage = Math.ceil(this.number / 15);
            if (!this.keyword) {
                throw new Error('Keyword is missing');
            }
            if (this.number > CONST.limit.product) {
                throw new Error(`Wow.... slow down cowboy. Maximum you can get is ${CONST.limit.product} products`);
            }
            if (typeof this.sponsored !== 'boolean') {
                throw new Error('Sponsored can only be {true} or {false}');
            }
        }
        if (this.scrapeType === 'reviews') {
            this.asyncPage = Math.ceil(this.number / 10);
            if (!this.fsin) {
                throw new Error('fSIN is missing');
            }
            if (this.number > CONST.limit.reviews) {
                throw new Error(`Wow.... slow down cowboy. Maximum you can get is ${CONST.limit.reviews} reviews`);
            }
        }
        if (this.scrapeType === 'fsin') {
            if (!this.fsin) {
                throw new Error('fSIN is missing');
            }
        }
        if (!Array.isArray(this.rating)) {
            throw new Error('rating can only be an array with length of 2');
        }

        if (this.rating.length > 2) {
            throw new Error('rating can only be an array with length of 2');
        }

        if (!parseFloat(this.rating[0]) || !parseFloat(this.rating[1])) {
            throw new Error('rating can only contain 2 float values');
        }

        this.minRating = parseFloat(this.rating[0]);

        this.maxRating = parseFloat(this.rating[1]);

        if (this.minRating > this.maxRating) {
            throw new Error(`min rating can't be larger then max rating`);
        }
        if (this.cli) {
            spinner.start();
        }

        await this.mainLoop();

        this.sortAndFilterResult();

        await this.saveResultToFile();

        if (this.cli) {
            spinner.stop();
        }
        if (this.fileType && this.cli) {
            console.log(`Result was saved to: ${this.fileName}`);
        }
        return {
            ...(this.scrapeType === 'products' ? { totalProducts: this.totalProducts, category: this.productSearchCategory } : {}),
            ...(this.scrapeType === 'reviews' ? { ...this.reviewMetadata } : {}),
            result: this.collector,
        };
    }
    async mainLoop() {
        return new Promise((resolve, reject) => {
            forEachLimit(
                Array.from({ length: this.asyncPage }, (_, k) => k + 1),
                this.asyncTasks,
                async (item) => {
                    // item is page
                    const body = await this.buildRequest(this.bulk ? item : this.searchPage);
                    if (this.scrapeType === 'asin') {
                        this.grabAsinDetails(body);
                        throw new Error('Done');
                    }
                    if (this.scrapeType === 'products') {
                        let totalResultCount = body.match(/"totalResultCount":\w+(.[0-9])/gm);

                        if (totalResultCount) {
                            this.totalProducts = totalResultCount[0].split('totalResultCount":')[1];
                        }
                        this.grabProduct(body, item);
                    }
                    if (this.scrapeType === 'reviews') {
                        this.grabReviews(body);
                    }
                    if (!this.bulk) {
                        throw new Error('Done');
                    }
                },
                (err) => {
                    if (err && err.message != 'Done') reject(err);
                    resolve();
                },
            );
        });
    }
    async buildRequest(page) {
        const options = {
            method: 'GET',
            uri: this.setRequestEndpoint,
            qs: {
                ...(this.scrapeType === 'products'
                    ? {
                          q: this.keyword,
                          ...(this.productSearchCategory ? { i: this.productSearchCategory } : {}),
                          ...(page > 1 ? { page, ref: `page=${page}` } : {}),
                      }
                    : {}),
            },
        };
        try {
            const response = await this.httpRequest(options);
            return response.body;
        } catch (error) {
            throw error.message;
        }
    }
    get setRequestEndpoint() {
        switch (this.scrapeType) {
            case 'products':
                return 'search';
        }
    }
}
F = new FlipkartScrapper({ keyword: 'Iphone 15', geo: geo, scrapeType: 'products', timeout: 1000, asyncTasks: 1 });
F.buildRequest(1)
    .then((res) => console.log(res))
    .catch((err) => console.log(err));
