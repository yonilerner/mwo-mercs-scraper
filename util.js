const DELAY_TIME = 1500
const moment = require('moment')

async function delayIfDelay(delay = DELAY_TIME) {
    if (delay !== false) {
        await sleep(delay)
    }
}

async function sleep(ms) {
    return new Promise(res => {
        setTimeout(function () {
            res()
        }, ms)
    })
}

function writeToLog(message, isError) {
    const timestamp = moment().add(1, 'hours').format('YYYY-MM-DD HH:mm:ss')
    const msg = `${timestamp}: ${message}`
    if (isError) {
        console.error(msg)
    } else {
        console.log(msg)
    }
}

module.exports = {
    delayIfDelay,
    sleep,
    writeToLog,
    DELAY_TIME
}
