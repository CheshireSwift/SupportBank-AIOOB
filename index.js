const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const readlineSync = require('readline-sync');
const moment = require('moment');
const log4js = require('log4js');

class Account {
    constructor(name) {
        this.name = name;
        this.balance = 0;
        this.transactions = [];
    }
}

class Transaction {
    constructor(srcAccount, dstAccount, date, reason, amount) {
        this.srcAccount = srcAccount;
        this.dstAccount = dstAccount;
        this.date = date;
        this.reason = reason;
        this.amount = amount;

        srcAccount.transactions.push(this);
        dstAccount.transactions.push(this);
        srcAccount.balance -= amount;
        dstAccount.balance += amount;
    }
}

log4js.configure({
    appenders: {
        file: {
            type: 'fileSync',
            filename: 'logs/debug.log'
        }
    },
    categories: {
        default: {
            appenders: ['file'],
            level: 'debug'
        }
    }
});
const logger = log4js.getLogger('index.js');
logger.info('Logging Initialised');
logger.info('Args: ' + process.argv);

if (process.argv.length < 3) {
    console.log('You must supply at least one csv file to read from');
    process.exit(1);
}

const accounts = new Map();
const transactions = [];
for (let i = 2; i < process.argv.length; i++) {
    const fileName = process.argv[i];
    logger.debug('Loading file: ' + fileName);
    parseCSV(fileName, accounts, transactions);
}

readlineSync.promptLoop(processCommand);

function parseCSV(fileName, accounts, transactions) {
    const csv = fs.readFileSync(fileName, {encoding: 'UTF-8'});
    if (!csv) {
        logger.fatal(`${fileName} couldn't be read, obtained ${csv}`);
        console.log(`The supplied csv file ${fileName} couldn't be read.`);
        process.exit(1);
    }
    const records = parse(csv, {columns: true});

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        logger.debug(`Importing transaction: ${JSON.stringify(record)}`);
        const date = moment(record.Date, 'DD/MM/YYYY');
        if (!date.isValid()) {
            logger.warn(`Invalid date in ${fileName} got ${JSON.stringify(record)}`);
            console.log(`Invalid record in ${fileName} due to bad date, skipping.`);
            continue;
        }
        const srcAccount = getOrCreateAccount(accounts, record.From);
        const dstAccount = getOrCreateAccount(accounts, record.To);
        const amount = Math.round(100 * parseFloat(record.Amount));
        if (!amount) {
            logger.warn(`Invalid amount in ${fileName} got ${JSON.stringify(record)}`);
            console.log(`Invalid record in ${fileName} due to bad amount, skipping.`);
            continue;
        }
        const transaction = new Transaction(srcAccount, dstAccount, date, record.Narrative, amount);
        transactions.push(transaction);
    }
}

function getOrCreateAccount(accounts, name) {
    if (!accounts.has(name)) {
        accounts.set(name, new Account(name));
    }
    return accounts.get(name);
}

function processCommand(input) {
    if (input == 'Quit') {
        logger.info('Quitting');
        return true;
    }
    if (input.startsWith('List ')) {
        const accountName = input.slice(5);
        logger.debug(`List command received for account: ${accountName}`);
        if (accountName == 'All') {
            printAllAccounts();
        } else if (accounts.has(accountName)) {
            printAccountInfo(accounts.get(accountName));
        } else {
            logger.debug(`List command received for invalid account: ${accountName}`);
            console.log('The specified account doesn\'t exist');
        }
    } else {
        printHelp();
    }
    return false;
}

function printAllAccounts(accounts) {
    logger.debug('Listing all accounts.');
    console.log("All accounts:");
    accounts.forEach(account => {
        const balance = (account.balance / 100).toFixed(2);
        console.log(`${account.name} owes ${balance} in total`);
    });
}

function printAccountInfo(account) {
    logger.debug(`Listing transactions for: ${accountName}`);
    console.log(`Transactions involving ${accountName}:`);
    let account = accounts.get(accountName);
    for (let i = 0; i < account.transactions.length; i++) {
        const transaction = account.transactions[i];
        const date = transaction.date.format('DD/MM/YYYY');
        const amount = (transaction.amount / 100).toFixed(2);
        console.log(`[${date}] ${amount} from ${transaction.srcAccount.name} to ${transaction.dstAccount.name} for ${transaction.reason}`);
    }
}

function printHelp() {
    logger.debug('Unrecognised command: ' + input);
    console.log(`
The available commands are:
List All: Prints the name of every account and the balance
List [Account]: Prints a list of all transactions associated with the account
Quit: Exits the program.
    `.trim());
}