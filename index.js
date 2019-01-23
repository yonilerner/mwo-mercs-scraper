const {writeToLog, scrapeAndSave, sleep} = require('./scrape')
const {getPlayers} = require('./djo-db')

exports.handler = async () => {
    /// THIS IS WHAT WE WANT TO LOOP
    while (true) {
        writeToLog(`Test 1`)
        console.log(`Starting MWO Mercs scrape`)
        const players = await getPlayers()
        await scrapeAndSave(players)
        console.log(`End of MWO Mercs scrape`)
        await sleep(1000)
        console.log(`Resting for 20 minutes...`)
        await sleep(1199000)
    }

    return {
        statusCode: 200
    }
};

exports.handler()
    .catch(e => {
        console.error(e)
    })
