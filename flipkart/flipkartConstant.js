const moment = require('moment');
const { reviewFilter } = require('../lib/constant');

module.exports = {
    limit : {
        products : 1000,
        reviews : 2000,
    },
    defaultItems : 15,
    reviewFilter :{
        recent : "MOST_RECENT",
        helpful : "MOST_HELPFUL",
    },
    filterByStar : {
        positive: 'positive',
            critical: 'critical',
            1: 'one_star',
            2: 'two_star',
            3: 'three_star',
            4: 'four_star',
            5: 'five_star',
    },
    formatType:{
        all_formats : "all_formats",
        current_format : "current_format",
    },
    geo : {
        IN : {
            country : "India",
            currency : "INR",
            host : "www.flipkart.com",
            symbol: '₹',
            variants : {
                split_text : 'click to select',
            },
            best_seller: (text) => {
                if (text) {
                    const match = text.match(/(#[\d,|]+) in[\s\n ]([\w&'\s]+)/);
                    if (match) {
                        return { rank: parseInt(match[1].replace(/[^\d]/g, '')), category: match[2].trim() };
                    }
                }
                return '';
            },
            review_date: (date) => {
                const dateRegex = /on (.+)$/.exec(date);
                if (dateRegex) {
                    return {
                        date: dateRegex[1],
                        unix: moment(new Date(`${dateRegex[1]} 02:00:00`))
                            .utc()
                            .unix(),
                    };
                }
                return '';
            },
            price_format: (price) => {
                const formatedPrice = price.replace(/[^\d+\.]/g, '');
                return parseFloat(formatedPrice);
            },
            product_information: {
                // <<------ NOT CORRECT! Requires translation of the {fields} key values. I don't have much time to do it
                id: [
                    '#_8tSq3v',
                    '#rYpYQA',
                ],
                fields: {
                    'Flipkart Best Sellers rank': { key: '', rank: true },
                    'Best-sellers rank': { key: '', rank: true },
                    'Best Sellers Rank': { key: '', rank: true },
                    'Package Dimensions': { key: 'dimensions' },
                    'Product Dimensions': { key: 'dimensions' },
                    'Parcel Dimensions': { key: 'dimensions' },
                    'Item Weight': { key: 'weight' },
                    Manufacturer: { key: 'manufacturer' },
                    'Release date': { key: 'available_from' },
                    'Date First Available': { key: 'available_from' },
                    'Item model number': { key: 'model_number' },
                    Department: { key: 'department' },
                },
            
            }

        }
    }
}