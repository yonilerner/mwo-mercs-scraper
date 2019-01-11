const {scrape} = require('./scrape')
const {getPlayers, saveStats} = require('./djo-db')

exports.handler = async (event) => {
    const players = await getPlayers()
    const playerData = await scrape(players)

    await saveStats(playerData)

    const response = {
        statusCode: 200,
        body: JSON.stringify(playerData),
    };
    console.log(response)
    return response;
};

exports.handler()