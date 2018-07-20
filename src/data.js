class Account {
    constructor(name) {
        this.name = name;
        this.transactions = [];
    }

    get balance() {
        return this.transactions.reduce((acc, transaction) => {
            if (transaction.dstAccount === this) {
                return acc + transaction.amount;
            } else {
                return acc - transaction.amount;
            }
        }, 0);
    }

    pay(account, date, reason, amount) {
        const transaction = new Transaction(this, account, date, reason, amount);
        this.transactions.push(transaction);
        account.transactions.push(transaction);
    }

    prettyPrint() {
        return `
Account: ${this.name}
Transactions:
  ${this.transactions.map(transaction => transaction.prettyPrint()).join('\n  ')}
        `.trim();
    }
}

class Transaction {
    constructor(srcAccount, dstAccount, date, reason, amount) {
        this.srcAccount = srcAccount;
        this.dstAccount = dstAccount;
        this.date = date;
        this.reason = reason;
        this.amount = amount;
    }

    prettyPrint() {
        const dateString = this.date.format('DD/MM/YYYY');
        const amountString = (this.amount / 100).toFixed(2);
        return `[${dateString}] ${amountString} from ${this.srcAccount.name} to ${this.dstAccount.name} for ${this.reason}`;
    }
}

module.exports = Account;