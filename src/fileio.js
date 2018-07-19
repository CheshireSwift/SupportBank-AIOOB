const log4js = require('log4js');
const fs = require('fs');
const csvToJs = require('csv-parse/lib/sync');
const xmlToJs = require('xml-js').xml2js;
const moment = require('moment');

const Account = require('./data.js');

const logger = log4js.getLogger('parser.js');

function parseFile(fileName, accounts) {
    let file;
    try {
        file = fs.readFileSync(fileName, {encoding: 'utf8'});
    } catch (error) {
        console.log(`${fileName} couldn't be read: ${error.message}`)
        logger.warn(error);
        return;
    }
    if (!file) {
        logger.fatal(`${fileName} couldn't be read, obtained ${file}`);
        console.log(`The supplied file ${fileName} couldn't be read.`);
        process.exit(1);
    }

    const parsers = {
        'csv': parseCSV,
        'json': parseJSON,
        'xml': parseXML,
    }
    const extension = fileName.substring(fileName.lastIndexOf('.') + 1);
    if (!parsers[extension]) {
        logger.warn(`Failed to import file ${fileName} unsupported type.`);
        console.log('Unsupported filetype.');
        return;
    }
    logger.info(`Importing file ${fileName} detected type ${extension}.`);
    const records = parsers[extension](file);

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        logger.debug(`Importing transaction: ${JSON.stringify(record)}`);
        const date = record.date;
        if (!date.isValid()) {
            logger.warn(`Invalid date in ${fileName} got ${JSON.stringify(record)}`);
            console.log(`Invalid record in ${fileName} due to bad date, skipping.`);
            continue;
        }
        const srcAccount = getOrCreateAccount(accounts, record.from);
        const dstAccount = getOrCreateAccount(accounts, record.to);
        const amount = Math.round(100 * parseFloat(record.amount));
        if (!amount) {
            logger.warn(`Invalid amount in ${fileName} got ${JSON.stringify(record)}`);
            console.log(`Invalid record in ${fileName} due to bad amount, skipping.`);
            continue;
        }
        srcAccount.pay(dstAccount, date, record.reason, amount);
    }
}

function getOrCreateAccount(accounts, name) {
    if (!accounts.has(name)) {
        accounts.set(name, new Account(name));
    }
    return accounts.get(name);
}

function parseCSV(input) {
    return csvToJs(input, {columns: true}).map(record => ({
        date: moment(record.Date, 'DD/MM/YYYY'),
        from: record.From,
        to: record.To,
        amount: parseFloat(record.Amount),
        reason: record.Narrative,
    }));
}

function parseJSON(input) {
    return JSON.parse(input).map(record => ({
        date: moment(record.Date),
        from: record.FromAccount,
        to: record.ToAccount,
        amount: parseFloat(record.Amount),
        reason: record.Narrative,
    }));
}

function parseXML(input) {
    let parsed = xmlToJs(input, {compact: true});
    return parsed.TransactionList.SupportTransaction.map(record => ({
        date: moment({year: 1900, month: 0, day: 1}).add(parseInt(record._attributes.Date), 'd'),
        from: record.Parties.From._text,
        to: record.Parties.To._text,
        amount: parseFloat(record.Value._text),
        reason: record.Description._text,
    }));
}

function writeFile(fileName, accounts) {
    logger.info(`Writing accounts to ${fileName}`);
    const file = Array.from(accounts.values()).map(account => account.prettyPrint()).join('\n\n');
    try {
        fs.writeFileSync(fileName, file, {encoding: 'utf8'});
    } catch(error) {
        logger.error(error);
        console.log(`${fileName} couldn't be written: ${error}`);
    }
}

module.exports = {
    parseFile,
    writeFile,
};
