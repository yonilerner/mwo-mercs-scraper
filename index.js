const {scrapeAndSave} = require('./scrape')
const {getPlayers} = require('./djo-db')

exports.handler = async () => {
    const players = await getPlayers()
    await scrapeAndSave(players)

    return {
        statusCode: 200
    }
};

exports.handler()
    .catch(e => {
        console.error(e)
    })