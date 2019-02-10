const {scrapeAndSave} = require('./scrape')
const {getPlayers} = require('./djo-db')
const {sleep, writeToLog} = require('./util')
const fs = require('fs')

exports.handler = async () => {
    // Program Loop
    while (true) {
        fs.writeFileSync('mwomercs-scraper.log', '')
        writeToLog(`Starting MWO Mercs scrape`)
        const players = await getPlayers()
        await scrapeAndSave(players)
        writeToLog(`End of MWO Mercs scrape`)
        await sleep(1000)
        writeToLog(`Resting for 20 minutes...`)
        await sleep(1199000)
    }
};

exports.handler()
    .catch(e => {
        writeToLog(`ERROR: ${e.stack}`)
    })

process.on('unhandledRejection', e => {
    writeToLog(`Unhandled rejection: ${e.stack}`)
    process.exit()
})