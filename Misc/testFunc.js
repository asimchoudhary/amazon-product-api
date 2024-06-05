const rp = require('request-promise');

const options = {};

rp(options)
    .then((response) => {
        console.log(response.body);
    })
    .catch((err) => {
        console.error(err);
    });
