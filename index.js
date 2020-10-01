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

// exports.handler()
//     .catch(e => {
//         writeToLog(`ERROR: ${e.stack}`)
//     })

const aws = require('aws-sdk')

const S3 = new aws.S3({
    endpoint: 'http://localhost:9090',
    // endpointDiscoveryEnabled: false,
    s3ForcePathStyle: true,
    // s3BucketEndpoint: false,
    // stsRegionalEndpoints: 'legacy',
    secretAccessKey: 'a',
    accessKeyId: 'b',
    // s3UsEast1RegionalEndpoint: 'legacy'
});

(async function() {
    const params = {Bucket: 'bucket-1'}
    let response = await S3.listObjectsV2(params).promise()
    console.log(response.Contents)
    await S3.putObject({...params, Key: 'foo', Body: 'bar'}).promise()
    response = await S3.listObjectsV2(params).promise()
    console.log(response.Contents)
    await S3.deleteObject({...params, Key: 'foo'}).promise()
    response = await S3.listObjectsV2(params).promise()
    console.log(response.Contents)
})()

process.on('unhandledRejection', e => {
    writeToLog(`Unhandled rejection: ${e.stack}`)
    process.exit()
})