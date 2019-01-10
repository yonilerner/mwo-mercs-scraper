const {run} = require('./scrape')

exports.handler = async (event) => {
    const result = await run()
    const response = {
        statusCode: 200,
        body: JSON.stringify(result),
    };
    return response;
};

exports.handler()