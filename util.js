const DELAY_TIME = 1500
const moment = require('moment')

async function delayIfDelay(delay = true) {
    if (delay) {
        await sleep(DELAY_TIME)
    }
}

async function sleep(ms) {
    return new Promise(res => {
        setTimeout(function () {
            res()
        }, ms)
    })
}

function writeToLog(message) {
    var timestamp = moment().add(1, 'hours').format('YYYY-MM-DD HH:mm:ss')
    console.log(`${timestamp}: ${message}`)
}

module.exports = {
    delayIfDelay,
    sleep,
    writeToLog
}
