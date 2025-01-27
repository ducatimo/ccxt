'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, ExchangeNotAvailable, RequestTimeout, AuthenticationError, PermissionDenied, DDoSProtection, InsufficientFunds, OrderNotFound, OrderNotCached, InvalidOrder, AccountSuspended, CancelPending, InvalidNonce, NotSupported } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class poloniex extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'poloniex',
            'name': 'Poloniex',
            'countries': [ 'US' ],
            'rateLimit': 1000, // up to 6 calls per second
            'has': {
                'CORS': false,
                'createDepositAddress': true,
                'createMarketOrder': false,
                'editOrder': true,
                'fetchClosedOrders': 'emulated',
                'fetchCurrencies': true,
                'fetchDepositAddress': true,
                'fetchDeposits': 'emulated',
                'fetchMyTrades': true,
                'fetchOHLCV': true,
                'fetchOpenOrder': true, // true endpoint for a single open order
                'fetchOpenOrders': true, // true endpoint for open orders
                'fetchOrder': 'emulated', // no endpoint for a single open-or-closed order (just for an open order only)
                'fetchOrderBooks': true,
                'fetchOrders': 'emulated', // no endpoint for open-or-closed orders (just for open orders only)
                'fetchOrderStatus': 'emulated', // no endpoint for status of a single open-or-closed order (just for open orders only)
                'fetchOrderTrades': true, // true endpoint for trades of a single open or closed order
                'fetchTickers': true,
                'fetchTradingFee': true,
                'fetchTradingFees': true,
                'fetchTransactions': true,
                'fetchWithdrawals': 'emulated', // but almost true )
                'withdraw': true,
            },
            'timeframes': {
                '5m': 300,
                '15m': 900,
                '30m': 1800,
                '2h': 7200,
                '4h': 14400,
                '1d': 86400,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27766817-e9456312-5ee6-11e7-9b3c-b628ca5626a5.jpg',
                'api': {
                    'public': 'https://poloniex.com/public',
                    'private': 'https://poloniex.com/tradingApi',
                },
                'www': 'https://poloniex.com',
                'doc': 'https://docs.poloniex.com',
                'fees': 'https://poloniex.com/fees',
            },
            'api': {
                'public': {
                    'get': [
                        'return24hVolume',
                        'returnChartData',
                        'returnCurrencies',
                        'returnLoanOrders',
                        'returnOrderBook',
                        'returnTicker',
                        'returnTradeHistory',
                    ],
                },
                'private': {
                    'post': [
                        'buy',
                        'cancelLoanOffer',
                        'cancelOrder',
                        'closeMarginPosition',
                        'createLoanOffer',
                        'generateNewAddress',
                        'getMarginPosition',
                        'marginBuy',
                        'marginSell',
                        'moveOrder',
                        'returnActiveLoans',
                        'returnAvailableAccountBalances',
                        'returnBalances',
                        'returnCompleteBalances',
                        'returnDepositAddresses',
                        'returnDepositsWithdrawals',
                        'returnFeeInfo',
                        'returnLendingHistory',
                        'returnMarginAccountSummary',
                        'returnOpenLoanOffers',
                        'returnOpenOrders',
                        'returnOrderTrades',
                        'returnOrderStatus',
                        'returnTradableBalances',
                        'returnTradeHistory',
                        'sell',
                        'toggleAutoRenew',
                        'transferBalance',
                        'withdraw',
                    ],
                },
            },
            'wsconf': {
                'conx-tpls': {
                    'default': {
                        'type': 'ws',
                        'baseurl': 'wss://api2.poloniex.com',
                    },
                },
                'events': {
                    'ob': {
                        'conx-tpl': 'default',
                        'conx-param': {
                            'url': '{baseurl}',
                            'id': '{id}',
                        },
                    },
                    'trade': {
                        'conx-tpl': 'default',
                        'conx-param': {
                            'url': '{baseurl}',
                            'id': '{id}',
                        },
                    },
                },
            },
            // Fees are tier-based. More info: https://poloniex.com/fees/
            // Rates below are highest possible.
            'fees': {
                'trading': {
                    'maker': 0.001,
                    'taker': 0.002,
                },
                'funding': {},
            },
            'limits': {
                'amount': {
                    'min': 0.000001,
                    'max': 1000000000,
                },
                'price': {
                    'min': 0.00000001,
                    'max': 1000000000,
                },
                'cost': {
                    'min': 0.00000000,
                    'max': 1000000000,
                },
            },
            'precision': {
                'amount': 8,
                'price': 8,
            },
            'commonCurrencies': {
                'AIR': 'AirCoin',
                'APH': 'AphroditeCoin',
                'BCC': 'BTCtalkcoin',
                'BDG': 'Badgercoin',
                'BTM': 'Bitmark',
                'CON': 'Coino',
                'GOLD': 'GoldEagles',
                'GPUC': 'GPU',
                'HOT': 'Hotcoin',
                'ITC': 'Information Coin',
                'PLX': 'ParallaxCoin',
                'KEY': 'KEYCoin',
                'STR': 'XLM',
                'SOC': 'SOCC',
                'XAP': 'API Coin',
            },
            'options': {
                'limits': {
                    'cost': {
                        'min': {
                            'BTC': 0.0001,
                            'ETH': 0.0001,
                            'XMR': 0.0001,
                            'USDT': 1.0,
                        },
                    },
                },
            },
            'exceptions': {
                'exact': {
                    'You may only place orders that reduce your position.': InvalidOrder,
                    'Invalid order number, or you are not the person who placed the order.': OrderNotFound,
                    'Permission denied': PermissionDenied,
                    'Connection timed out. Please try again.': RequestTimeout,
                    'Internal error. Please try again.': ExchangeNotAvailable,
                    'Order not found, or you are not the person who placed it.': OrderNotFound,
                    'Invalid API key/secret pair.': AuthenticationError,
                    'Please do not make more than 8 API calls per second.': DDoSProtection,
                    'Rate must be greater than zero.': InvalidOrder, // {"error":"Rate must be greater than zero."}
                },
                'broad': {
                    'Total must be at least': InvalidOrder, // {"error":"Total must be at least 0.0001."}
                    'This account is frozen.': AccountSuspended,
                    'Not enough': InsufficientFunds,
                    'Nonce must be greater': InvalidNonce,
                    'You have already called cancelOrder or moveOrder on this order.': CancelPending,
                    'Amount must be at least': InvalidOrder, // {"error":"Amount must be at least 0.000001."}
                    'is either completed or does not exist': InvalidOrder, // {"error":"Order 587957810791 is either completed or does not exist."}
                },
            },
        });
    }

    calculateFee (symbol, type, side, amount, price, takerOrMaker = 'taker', params = {}) {
        let market = this.markets[symbol];
        let key = 'quote';
        let rate = market[takerOrMaker];
        let cost = parseFloat (this.costToPrecision (symbol, amount * rate));
        if (side === 'sell') {
            cost *= price;
        } else {
            key = 'base';
        }
        return {
            'type': takerOrMaker,
            'currency': market[key],
            'rate': rate,
            'cost': parseFloat (this.feeToPrecision (symbol, cost)),
        };
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '5m', since = undefined, limit = undefined) {
        return [
            ohlcv['date'] * 1000,
            ohlcv['open'],
            ohlcv['high'],
            ohlcv['low'],
            ohlcv['close'],
            ohlcv['quoteVolume'],
        ];
    }

    async fetchOHLCV (symbol, timeframe = '5m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        if (since === undefined)
            since = 0;
        let request = {
            'currencyPair': market['id'],
            'period': this.timeframes[timeframe],
            'start': parseInt (since / 1000),
        };
        if (limit !== undefined) {
            request['end'] = this.sum (request['start'], limit * this.timeframes[timeframe]);
        } else {
            request['end'] = this.sum (this.seconds (), 1);
        }
        let response = await this.publicGetReturnChartData (this.extend (request, params));
        return this.parseOHLCVs (response, market, timeframe, since, limit);
    }

    async fetchMarkets (params = {}) {
        const markets = await this.publicGetReturnTicker ();
        const keys = Object.keys (markets);
        const result = [];
        for (let p = 0; p < keys.length; p++) {
            const id = keys[p];
            const market = markets[id];
            const [ quoteId, baseId ] = id.split ('_');
            const base = this.commonCurrencyCode (baseId);
            const quote = this.commonCurrencyCode (quoteId);
            const symbol = base + '/' + quote;
            const limits = this.extend (this.limits, {
                'cost': {
                    'min': this.safeValue (this.options['limits']['cost']['min'], quote),
                },
            });
            result.push (this.extend (this.fees['trading'], {
                'id': id,
                'id2': market['id'].toString (),
                'symbol': symbol,
                'baseId': baseId,
                'quoteId': quoteId,
                'base': base,
                'quote': quote,
                'active': market['isFrozen'] !== '1',
                'limits': limits,
                'info': market,
            }));
        }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let balances = await this.privatePostReturnCompleteBalances (this.extend ({
            'account': 'all',
        }, params));
        let result = { 'info': balances };
        let currencies = Object.keys (balances);
        for (let c = 0; c < currencies.length; c++) {
            let id = currencies[c];
            let balance = balances[id];
            let currency = this.commonCurrencyCode (id);
            let account = {
                'free': parseFloat (balance['available']),
                'used': parseFloat (balance['onOrders']),
                'total': 0.0,
            };
            account['total'] = this.sum (account['free'], account['used']);
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async fetchTradingFees (params = {}) {
        await this.loadMarkets ();
        let fees = await this.privatePostReturnFeeInfo ();
        return {
            'info': fees,
            'maker': this.safeFloat (fees, 'makerFee'),
            'taker': this.safeFloat (fees, 'takerFee'),
            'withdraw': {},
            'deposit': {},
        };
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {
            'currencyPair': this.marketId (symbol),
        };
        if (limit !== undefined) {
            request['depth'] = limit; // 100
        }
        let response = await this.publicGetReturnOrderBook (this.extend (request, params));
        let orderbook = this.parseOrderBook (response);
        orderbook['nonce'] = this.safeInteger (response, 'seq');
        return orderbook;
    }

    async fetchOrderBooks (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {
            'currencyPair': 'all',
        };
        //
        //     if (limit !== undefined) {
        //         request['depth'] = limit; // 100
        //     }
        //
        let response = await this.publicGetReturnOrderBook (this.extend (request, params));
        let marketIds = Object.keys (response);
        let result = {};
        for (let i = 0; i < marketIds.length; i++) {
            let marketId = marketIds[i];
            let symbol = undefined;
            if (marketId in this.markets_by_id) {
                symbol = this.markets_by_id[marketId]['symbol'];
            } else {
                let [ quoteId, baseId ] = marketId.split ('_');
                let base = this.commonCurrencyCode (baseId);
                let quote = this.commonCurrencyCode (quoteId);
                symbol = base + '/' + quote;
            }
            let orderbook = this.parseOrderBook (response[marketId]);
            orderbook['nonce'] = this.safeInteger (response[marketId], 'seq');
            result[symbol] = orderbook;
        }
        return result;
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = this.milliseconds ();
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        let open = undefined;
        let change = undefined;
        let average = undefined;
        let last = this.safeFloat (ticker, 'last');
        let relativeChange = this.safeFloat (ticker, 'percentChange');
        if (relativeChange !== -1) {
            open = last / this.sum (1, relativeChange);
            change = last - open;
            average = this.sum (last, open) / 2;
        }
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high24hr'),
            'low': this.safeFloat (ticker, 'low24hr'),
            'bid': this.safeFloat (ticker, 'highestBid'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'lowestAsk'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': open,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': change,
            'percentage': relativeChange * 100,
            'average': average,
            'baseVolume': this.safeFloat (ticker, 'quoteVolume'),
            'quoteVolume': this.safeFloat (ticker, 'baseVolume'),
            'info': ticker,
        };
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let tickers = await this.publicGetReturnTicker (params);
        let ids = Object.keys (tickers);
        let result = {};
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let symbol = undefined;
            let market = undefined;
            if (id in this.markets_by_id) {
                market = this.markets_by_id[id];
                symbol = market['symbol'];
            } else {
                let [ quoteId, baseId ] = id.split ('_');
                let base = this.commonCurrencyCode (baseId);
                let quote = this.commonCurrencyCode (quoteId);
                symbol = base + '/' + quote;
                market = { 'symbol': symbol };
            }
            let ticker = tickers[id];
            result[symbol] = this.parseTicker (ticker, market);
        }
        return result;
    }

    async fetchCurrencies (params = {}) {
        let currencies = await this.publicGetReturnCurrencies (params);
        let ids = Object.keys (currencies);
        let result = {};
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            let currency = currencies[id];
            // todo: will need to rethink the fees
            // to add support for multiple withdrawal/deposit methods and
            // differentiated fees for each particular method
            let precision = 8; // default precision, todo: fix "magic constants"
            let code = this.commonCurrencyCode (id);
            let active = (currency['delisted'] === 0) && !currency['disabled'];
            result[code] = {
                'id': id,
                'code': code,
                'info': currency,
                'name': currency['name'],
                'active': active,
                'fee': this.safeFloat (currency, 'txFee'), // todo: redesign
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'price': {
                        'min': Math.pow (10, -precision),
                        'max': Math.pow (10, precision),
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'withdraw': {
                        'min': currency['txFee'],
                        'max': Math.pow (10, precision),
                    },
                },
            };
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let tickers = await this.publicGetReturnTicker (params);
        let ticker = tickers[market['id']];
        return this.parseTicker (ticker, market);
    }

    parseTrade (trade, market = undefined) {
        //
        // fetchMyTrades (symbol defined, specific market)
        //
        //     {
        //         globalTradeID: 394698946,
        //         tradeID: 45210255,
        //         date: '2018-10-23 17:28:55',
        //         type: 'sell',
        //         rate: '0.03114126',
        //         amount: '0.00018753',
        //         total: '0.00000583'
        //     }
        //
        // fetchMyTrades (symbol undefined, all markets)
        //
        //     {
        //         globalTradeID: 394131412,
        //         tradeID: '5455033',
        //         date: '2018-10-16 18:05:17',
        //         rate: '0.06935244',
        //         amount: '1.40308443',
        //         total: '0.09730732',
        //         fee: '0.00100000',
        //         orderNumber: '104768235081',
        //         type: 'sell',
        //         category: 'exchange'
        //     }
        //
        const id = this.safeString (trade, 'globalTradeID');
        const orderId = this.safeString (trade, 'orderNumber');
        const timestamp = this.parse8601 (this.safeString (trade, 'date'));
        let symbol = undefined;
        let base = undefined;
        let quote = undefined;
        if ((!market) && ('currencyPair' in trade)) {
            let currencyPair = trade['currencyPair'];
            if (currencyPair in this.markets_by_id) {
                market = this.markets_by_id[currencyPair];
            } else {
                let parts = currencyPair.split ('_');
                quote = parts[0];
                base = parts[1];
                symbol = base + '/' + quote;
            }
        }
        if (market !== undefined) {
            symbol = market['symbol'];
            base = market['base'];
            quote = market['quote'];
        }
        const side = this.safeString (trade, 'type');
        let fee = undefined;
        const price = this.safeFloat (trade, 'rate');
        const cost = this.safeFloat (trade, 'total');
        const amount = this.safeFloat (trade, 'amount');
        if ('fee' in trade) {
            let rate = this.safeFloat (trade, 'fee');
            let feeCost = undefined;
            let currency = undefined;
            if (side === 'buy') {
                currency = base;
                feeCost = amount * rate;
            } else {
                currency = quote;
                if (cost !== undefined)
                    feeCost = cost * rate;
            }
            fee = {
                'type': undefined,
                'rate': rate,
                'cost': feeCost,
                'currency': currency,
            };
        }
        return {
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'id': id,
            'order': orderId,
            'type': 'limit',
            'side': side,
            'price': price,
            'amount': amount,
            'cost': cost,
            'fee': fee,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'currencyPair': market['id'],
        };
        if (since !== undefined) {
            request['start'] = parseInt (since / 1000);
            request['end'] = this.seconds (); // last 50000 trades by default
        }
        let trades = await this.publicGetReturnTradeHistory (this.extend (request, params));
        return this.parseTrades (trades, market, since, limit);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        if (symbol !== undefined)
            market = this.market (symbol);
        let pair = market ? market['id'] : 'all';
        let request = { 'currencyPair': pair };
        if (since !== undefined) {
            request['start'] = parseInt (since / 1000);
            request['end'] = this.seconds () + 1; // adding 1 is a fix for #3411
        }
        // limit is disabled (does not really work as expected)
        if (limit !== undefined)
            request['limit'] = parseInt (limit);
        let response = await this.privatePostReturnTradeHistory (this.extend (request, params));
        //
        // specific market (symbol defined)
        //
        //     [
        //         {
        //             globalTradeID: 394700861,
        //             tradeID: 45210354,
        //             date: '2018-10-23 18:01:58',
        //             type: 'buy',
        //             rate: '0.03117266',
        //             amount: '0.00000652',
        //             total: '0.00000020'
        //         },
        //         {
        //             globalTradeID: 394698946,
        //             tradeID: 45210255,
        //             date: '2018-10-23 17:28:55',
        //             type: 'sell',
        //             rate: '0.03114126',
        //             amount: '0.00018753',
        //             total: '0.00000583'
        //         }
        //     ]
        //
        // all markets (symbol undefined)
        //
        //     {
        //         BTC_BCH: [{
        //             globalTradeID: 394131412,
        //             tradeID: '5455033',
        //             date: '2018-10-16 18:05:17',
        //             rate: '0.06935244',
        //             amount: '1.40308443',
        //             total: '0.09730732',
        //             fee: '0.00100000',
        //             orderNumber: '104768235081',
        //             type: 'sell',
        //             category: 'exchange'
        //         }, {
        //             globalTradeID: 394126818,
        //             tradeID: '5455007',
        //             date: '2018-10-16 16:55:34',
        //             rate: '0.06935244',
        //             amount: '0.00155709',
        //             total: '0.00010798',
        //             fee: '0.00200000',
        //             orderNumber: '104768179137',
        //             type: 'sell',
        //             category: 'exchange'
        //         }],
        //     }
        //
        let result = [];
        if (market !== undefined) {
            result = this.parseTrades (response, market);
        } else {
            if (response) {
                let ids = Object.keys (response);
                for (let i = 0; i < ids.length; i++) {
                    let id = ids[i];
                    let market = undefined;
                    if (id in this.markets_by_id) {
                        market = this.markets_by_id[id];
                        let trades = this.parseTrades (response[id], market);
                        for (let j = 0; j < trades.length; j++) {
                            result.push (trades[j]);
                        }
                    } else {
                        let [ quoteId, baseId ] = id.split ('_');
                        let base = this.commonCurrencyCode (baseId);
                        let quote = this.commonCurrencyCode (quoteId);
                        let symbol = base + '/' + quote;
                        let trades = response[id];
                        for (let j = 0; j < trades.length; j++) {
                            result.push (this.extend (this.parseTrade (trades[j]), {
                                'symbol': symbol,
                            }));
                        }
                    }
                }
            }
        }
        return this.filterBySinceLimit (result, since, limit);
    }

    parseOrderStatus (status) {
        const statuses = {
            'Open': 'open',
            'Partially filled': 'open',
        };
        return this.safeString (statuses, status, status);
    }

    parseOrder (order, market = undefined) {
        //
        // fetchOpenOrder
        //
        //     {
        //         status: 'Open',
        //         rate: '0.40000000',
        //         amount: '1.00000000',
        //         currencyPair: 'BTC_ETH',
        //         date: '2018-10-17 17:04:50',
        //         total: '0.40000000',
        //         type: 'buy',
        //         startingAmount: '1.00000',
        //     }
        //
        // fetchOpenOrders
        //
        //     {
        //         orderNumber: '514514894224',
        //         type: 'buy',
        //         rate: '0.00001000',
        //         startingAmount: '100.00000000',
        //         amount: '100.00000000',
        //         total: '0.00100000',
        //         date: '2018-10-23 17:38:53',
        //         margin: 0,
        //     }
        //
        let timestamp = this.safeInteger (order, 'timestamp');
        if (!timestamp)
            timestamp = this.parse8601 (order['date']);
        let trades = undefined;
        if ('resultingTrades' in order)
            trades = this.parseTrades (order['resultingTrades'], market);
        let symbol = undefined;
        const marketId = this.safeString (order, 'currencyPair');
        market = this.safeValue (this.markets_by_id, marketId, market);
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        let price = this.safeFloat2 (order, 'price', 'rate');
        let remaining = this.safeFloat (order, 'amount');
        let amount = this.safeFloat (order, 'startingAmount', remaining);
        let filled = undefined;
        let cost = 0;
        if (amount !== undefined) {
            if (remaining !== undefined) {
                filled = amount - remaining;
                if (price !== undefined)
                    cost = filled * price;
            }
        }
        if (filled === undefined) {
            if (trades !== undefined) {
                filled = 0;
                cost = 0;
                for (let i = 0; i < trades.length; i++) {
                    let trade = trades[i];
                    let tradeAmount = trade['amount'];
                    let tradePrice = trade['price'];
                    filled = this.sum (filled, tradeAmount);
                    cost += tradePrice * tradeAmount;
                }
            }
        }
        const status = this.parseOrderStatus (this.safeString (order, 'status'));
        let type = this.safeString (order, 'type');
        const side = this.safeString (order, 'side', type);
        if (type === side) {
            type = undefined;
        }
        return {
            'info': order,
            'id': order['orderNumber'],
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'status': status,
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'cost': cost,
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'trades': trades,
            'fee': undefined,
        };
    }

    parseOpenOrders (orders, market, result) {
        for (let i = 0; i < orders.length; i++) {
            let order = orders[i];
            let extended = this.extend (order, {
                'status': 'open',
                'type': 'limit',
                'side': order['type'],
                'price': order['rate'],
            });
            result.push (this.parseOrder (extended, market));
        }
        return result;
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        if (symbol !== undefined)
            market = this.market (symbol);
        let pair = market ? market['id'] : 'all';
        let response = await this.privatePostReturnOpenOrders (this.extend ({
            'currencyPair': pair,
        }));
        let openOrders = [];
        if (market !== undefined) {
            openOrders = this.parseOpenOrders (response, market, openOrders);
        } else {
            let marketIds = Object.keys (response);
            for (let i = 0; i < marketIds.length; i++) {
                let marketId = marketIds[i];
                let orders = response[marketId];
                let m = this.markets_by_id[marketId];
                openOrders = this.parseOpenOrders (orders, m, openOrders);
            }
        }
        for (let j = 0; j < openOrders.length; j++) {
            this.orders[openOrders[j]['id']] = openOrders[j];
        }
        let openOrdersIndexedById = this.indexBy (openOrders, 'id');
        let cachedOrderIds = Object.keys (this.orders);
        let result = [];
        for (let k = 0; k < cachedOrderIds.length; k++) {
            let id = cachedOrderIds[k];
            if (id in openOrdersIndexedById) {
                this.orders[id] = this.extend (this.orders[id], openOrdersIndexedById[id]);
            } else {
                let order = this.orders[id];
                if (order['status'] === 'open') {
                    order = this.extend (order, {
                        'status': 'closed',
                        'cost': undefined,
                        'filled': order['amount'],
                        'remaining': 0.0,
                    });
                    if (order['cost'] === undefined) {
                        if (order['filled'] !== undefined)
                            order['cost'] = order['filled'] * order['price'];
                    }
                    this.orders[id] = order;
                }
            }
            let order = this.orders[id];
            if (market !== undefined) {
                if (order['symbol'] === symbol)
                    result.push (order);
            } else {
                result.push (order);
            }
        }
        return this.filterBySinceLimit (result, since, limit);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        let since = this.safeValue (params, 'since');
        let limit = this.safeValue (params, 'limit');
        let request = this.omit (params, [ 'since', 'limit' ]);
        let orders = await this.fetchOrders (symbol, since, limit, request);
        for (let i = 0; i < orders.length; i++) {
            if (orders[i]['id'] === id)
                return orders[i];
        }
        throw new OrderNotCached (this.id + ' order id ' + id.toString () + ' is not in "open" state and not found in cache');
    }

    filterOrdersByStatus (orders, status) {
        let result = [];
        for (let i = 0; i < orders.length; i++) {
            if (orders[i]['status'] === status)
                result.push (orders[i]);
        }
        return result;
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let orders = await this.fetchOrders (symbol, since, limit, params);
        return this.filterOrdersByStatus (orders, 'open');
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let orders = await this.fetchOrders (symbol, since, limit, params);
        return this.filterOrdersByStatus (orders, 'closed');
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        if (type === 'market')
            throw new ExchangeError (this.id + ' allows limit orders only');
        await this.loadMarkets ();
        let method = 'privatePost' + this.capitalize (side);
        let market = this.market (symbol);
        let request = {
            'currencyPair': market['id'],
            'rate': this.priceToPrecision (symbol, price),
            'amount': this.amountToPrecision (symbol, amount),
        };
        let response = await this[method] (this.extend (request, params));
        let timestamp = this.milliseconds ();
        let order = this.parseOrder (this.extend ({
            'timestamp': timestamp,
            'status': 'open',
            'type': type,
            'side': side,
            'price': price,
            'amount': amount,
        }, response), market);
        let id = order['id'];
        this.orders[id] = order;
        return this.extend ({ 'info': response }, order);
    }

    async editOrder (id, symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets ();
        price = parseFloat (price);
        let request = {
            'orderNumber': id,
            'rate': this.priceToPrecision (symbol, price),
        };
        if (amount !== undefined) {
            request['amount'] = this.amountToPrecision (symbol, amount);
        }
        let response = await this.privatePostMoveOrder (this.extend (request, params));
        let result = undefined;
        if (id in this.orders) {
            this.orders[id]['status'] = 'canceled';
            let newid = response['orderNumber'];
            this.orders[newid] = this.extend (this.orders[id], {
                'id': newid,
                'price': price,
                'status': 'open',
            });
            if (amount !== undefined)
                this.orders[newid]['amount'] = amount;
            result = this.extend (this.orders[newid], { 'info': response });
        } else {
            let market = undefined;
            if (symbol !== undefined)
                market = this.market (symbol);
            result = this.parseOrder (response, market);
            this.orders[result['id']] = result;
        }
        return result;
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = undefined;
        try {
            response = await this.privatePostCancelOrder (this.extend ({
                'orderNumber': id,
            }, params));
        } catch (e) {
            if (e instanceof CancelPending) {
                // A request to cancel the order has been sent already.
                // If we then attempt to cancel the order the second time
                // before the first request is processed the exchange will
                // throw a CancelPending exception. Poloniex won't show the
                // order in the list of active (open) orders and the cached
                // order will be marked as 'closed' (see #1801 for details).
                // To avoid that we proactively mark the order as 'canceled'
                // here. If for some reason the order does not get canceled
                // and still appears in the active list then the order cache
                // will eventually get back in sync on a call to `fetchOrder`.
                if (id in this.orders)
                    this.orders[id]['status'] = 'canceled';
            }
            throw e;
        }
        if (id in this.orders)
            this.orders[id]['status'] = 'canceled';
        return response;
    }

    async fetchOpenOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        id = id.toString ();
        const response = await this.privatePostReturnOrderStatus (this.extend ({
            'orderNumber': id,
        }, params));
        //
        //     {
        //         success: 1,
        //         result: {
        //             '6071071': {
        //                 status: 'Open',
        //                 rate: '0.40000000',
        //                 amount: '1.00000000',
        //                 currencyPair: 'BTC_ETH',
        //                 date: '2018-10-17 17:04:50',
        //                 total: '0.40000000',
        //                 type: 'buy',
        //                 startingAmount: '1.00000',
        //             },
        //         },
        //     }
        //
        const result = this.safeValue (response['result'], id);
        if (result === undefined) {
            throw new OrderNotFound (this.id + ' order id ' + id + ' not found');
        }
        const order = this.parseOrder (result);
        order['id'] = id;
        this.orders[id] = order;
        return order;
    }

    async fetchOrderStatus (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let orders = await this.fetchOpenOrders (symbol, undefined, undefined, params);
        let indexed = this.indexBy (orders, 'id');
        return (id in indexed) ? 'open' : 'closed';
    }

    async fetchOrderTrades (id, symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let trades = await this.privatePostReturnOrderTrades (this.extend ({
            'orderNumber': id,
        }, params));
        return this.parseTrades (trades);
    }

    async createDepositAddress (code, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        let response = await this.privatePostGenerateNewAddress ({
            'currency': currency['id'],
        });
        let address = undefined;
        let tag = undefined;
        if (response['success'] === 1)
            address = this.safeString (response, 'response');
        this.checkAddress (address);
        const depositAddress = this.safeString (currency['info'], 'depositAddress');
        if (depositAddress !== undefined) {
            tag = address;
            address = depositAddress;
        }
        return {
            'currency': code,
            'address': address,
            'tag': tag,
            'info': response,
        };
    }

    async fetchDepositAddress (code, params = {}) {
        await this.loadMarkets ();
        let currency = this.currency (code);
        let response = await this.privatePostReturnDepositAddresses ();
        let currencyId = currency['id'];
        let address = this.safeString (response, currencyId);
        let tag = undefined;
        this.checkAddress (address);
        const depositAddress = this.safeString (currency['info'], 'depositAddress');
        if (depositAddress !== undefined) {
            tag = address;
            address = depositAddress;
        }
        return {
            'currency': code,
            'address': address,
            'tag': tag,
            'info': response,
        };
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        await this.loadMarkets ();
        let currency = this.currency (code);
        let request = {
            'currency': currency['id'],
            'amount': amount,
            'address': address,
        };
        if (tag)
            request['paymentId'] = tag;
        let result = await this.privatePostWithdraw (this.extend (request, params));
        return {
            'info': result,
            'id': result['response'],
        };
    }

    async fetchTransactionsHelper (code = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const year = 31104000; // 60 * 60 * 24 * 30 * 12 = one year of history, why not
        const now = this.seconds ();
        let start = (since !== undefined) ? parseInt (since / 1000) : now - 10 * year;
        let request = {
            'start': start, // UNIX timestamp, required
            'end': now, // UNIX timestamp, required
        };
        if (limit !== undefined)
            request['limit'] = limit;
        let response = await this.privatePostReturnDepositsWithdrawals (this.extend (request, params));
        //
        //     {    deposits: [ {      currency: "BTC",
        //                              address: "1MEtiqJWru53FhhHrfJPPvd2tC3TPDVcmW",
        //                               amount: "0.01063000",
        //                        confirmations:  1,
        //                                 txid: "952b0e1888d6d491591facc0d37b5ebec540ac1efb241fdbc22bcc20d1822fb6",
        //                            timestamp:  1507916888,
        //                               status: "COMPLETE"                                                          },
        //                      {      currency: "ETH",
        //                              address: "0x20108ba20b65c04d82909e91df06618107460197",
        //                               amount: "4.00000000",
        //                        confirmations:  38,
        //                                 txid: "0x4be260073491fe63935e9e0da42bd71138fdeb803732f41501015a2d46eb479d",
        //                            timestamp:  1525060430,
        //                               status: "COMPLETE"                                                            }  ],
        //       withdrawals: [ { withdrawalNumber:  8224394,
        //                                currency: "EMC2",
        //                                 address: "EYEKyCrqTNmVCpdDV8w49XvSKRP9N3EUyF",
        //                                  amount: "63.10796020",
        //                                     fee: "0.01000000",
        //                               timestamp:  1510819838,
        //                                  status: "COMPLETE: d37354f9d02cb24d98c8c4fc17aa42f475530b5727effdf668ee5a43ce667fd6",
        //                               ipAddress: "5.220.220.200"                                                               },
        //                      { withdrawalNumber:  9290444,
        //                                currency: "ETH",
        //                                 address: "0x191015ff2e75261d50433fbd05bd57e942336149",
        //                                  amount: "0.15500000",
        //                                     fee: "0.00500000",
        //                               timestamp:  1514099289,
        //                                  status: "COMPLETE: 0x12d444493b4bca668992021fd9e54b5292b8e71d9927af1f076f554e4bea5b2d",
        //                               ipAddress: "5.228.227.214"                                                                 },
        //                      { withdrawalNumber:  11518260,
        //                                currency: "BTC",
        //                                 address: "8JoDXAmE1GY2LRK8jD1gmAmgRPq54kXJ4t",
        //                                  amount: "0.20000000",
        //                                     fee: "0.00050000",
        //                               timestamp:  1527918155,
        //                                  status: "COMPLETE: 1864f4ebb277d90b0b1ff53259b36b97fa1990edc7ad2be47c5e0ab41916b5ff",
        //                               ipAddress: "211.8.195.26"                                                                }    ] }
        //
        return response;
    }

    async fetchTransactions (code = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.fetchTransactionsHelper (code, since, limit, params);
        for (let i = 0; i < response['deposits'].length; i++) {
            response['deposits'][i]['type'] = 'deposit';
        }
        for (let i = 0; i < response['withdrawals'].length; i++) {
            response['withdrawals'][i]['type'] = 'withdrawal';
        }
        let currency = undefined;
        if (code !== undefined) {
            currency = this.currency (code);
        }
        let withdrawals = this.parseTransactions (response['withdrawals'], currency, since, limit);
        let deposits = this.parseTransactions (response['deposits'], currency, since, limit);
        let transactions = this.arrayConcat (deposits, withdrawals);
        return this.filterByCurrencySinceLimit (this.sortBy (transactions, 'timestamp'), code, since, limit);
    }

    async fetchWithdrawals (code = undefined, since = undefined, limit = undefined, params = {}) {
        let response = await this.fetchTransactionsHelper (code, since, limit, params);
        for (let i = 0; i < response['withdrawals'].length; i++) {
            response['withdrawals'][i]['type'] = 'withdrawal';
        }
        let currency = undefined;
        if (code !== undefined) {
            currency = this.currency (code);
        }
        let withdrawals = this.parseTransactions (response['withdrawals'], currency, since, limit);
        return this.filterByCurrencySinceLimit (withdrawals, code, since, limit);
    }

    async fetchDeposits (code = undefined, since = undefined, limit = undefined, params = {}) {
        let response = await this.fetchTransactionsHelper (code, since, limit, params);
        for (let i = 0; i < response['deposits'].length; i++) {
            response['deposits'][i]['type'] = 'deposit';
        }
        let currency = undefined;
        if (code !== undefined) {
            currency = this.currency (code);
        }
        let deposits = this.parseTransactions (response['deposits'], currency, since, limit);
        return this.filterByCurrencySinceLimit (deposits, code, since, limit);
    }

    parseTransactionStatus (status) {
        const statuses = {
            'COMPLETE': 'ok',
        };
        return this.safeString (statuses, status, status);
    }

    parseTransaction (transaction, currency = undefined) {
        //
        // deposits
        //
        //     {
        //         "txid": "f49d489616911db44b740612d19464521179c76ebe9021af85b6de1e2f8d68cd",
        //         "type": "deposit",
        //         "amount": "49798.01987021",
        //         "status": "COMPLETE",
        //         "address": "DJVJZ58tJC8UeUv9Tqcdtn6uhWobouxFLT",
        //         "currency": "DOGE",
        //         "timestamp": 1524321838,
        //         "confirmations": 3371,
        //         "depositNumber": 134587098
        //     }
        //
        // withdrawals
        //
        //     {
        //         "fee": "0.00050000",
        //         "type": "withdrawal",
        //         "amount": "0.40234387",
        //         "status": "COMPLETE: fbabb2bf7d81c076f396f3441166d5f60f6cea5fdfe69e02adcc3b27af8c2746",
        //         "address": "1EdAqY4cqHoJGAgNfUFER7yZpg1Jc9DUa3",
        //         "currency": "BTC",
        //         "canCancel": 0,
        //         "ipAddress": "185.230.101.31",
        //         "paymentID": null,
        //         "timestamp": 1523834337,
        //         "canResendEmail": 0,
        //         "withdrawalNumber": 11162900
        //     }
        //
        let timestamp = this.safeInteger (transaction, 'timestamp');
        if (timestamp !== undefined) {
            timestamp = timestamp * 1000;
        }
        let code = undefined;
        let currencyId = this.safeString (transaction, 'currency');
        currency = this.safeValue (this.currencies_by_id, currencyId);
        if (currency === undefined) {
            code = this.commonCurrencyCode (currencyId);
        }
        if (currency !== undefined) {
            code = currency['code'];
        }
        let status = this.safeString (transaction, 'status', 'pending');
        let txid = this.safeString (transaction, 'txid');
        if (status !== undefined) {
            let parts = status.split (': ');
            let numParts = parts.length;
            status = parts[0];
            if ((numParts > 1) && (txid === undefined)) {
                txid = parts[1];
            }
            status = this.parseTransactionStatus (status);
        }
        const type = this.safeString (transaction, 'type');
        const id = this.safeString2 (transaction, 'withdrawalNumber', 'depositNumber');
        let amount = this.safeFloat (transaction, 'amount');
        const address = this.safeString (transaction, 'address');
        let feeCost = this.safeFloat (transaction, 'fee');
        if (feeCost === undefined) {
            // according to https://poloniex.com/fees/
            feeCost = 0; // FIXME: remove hardcoded value that may change any time
        }
        if (type === 'withdrawal') {
            // poloniex withdrawal amount includes the fee
            amount = amount - feeCost;
        }
        return {
            'info': transaction,
            'id': id,
            'currency': code,
            'amount': amount,
            'address': address,
            'tag': undefined,
            'status': status,
            'type': type,
            'updated': undefined,
            'txid': txid,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'fee': {
                'currency': code,
                'cost': feeCost,
            },
        };
    }

    nonce () {
        return this.milliseconds ();
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'][api];
        let query = this.extend ({ 'command': path }, params);
        if (api === 'public') {
            url += '?' + this.urlencode (query);
        } else {
            this.checkRequiredCredentials ();
            query['nonce'] = this.nonce ();
            body = this.urlencode (query);
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Key': this.apiKey,
                'Sign': this.hmac (this.encode (body), this.encode (this.secret), 'sha512'),
            };
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (code, reason, url, method, headers, body, response) {
        if (response === undefined) {
            return;
        }
        // {"error":"Permission denied."}
        if ('error' in response) {
            const message = response['error'];
            const feedback = this.id + ' ' + this.json (response);
            let exact = this.exceptions['exact'];
            if (message in exact) {
                throw new exact[message] (feedback);
            }
            const broad = this.exceptions['broad'];
            const broadKey = this.findBroadlyMatchedKey (broad, message);
            if (broadKey !== undefined) {
                throw new broad[broadKey] (feedback);
            }
            throw new ExchangeError (feedback); // unknown message
        }
    }

    _websocketGenerateUrlStream (events, options) {
        return options['url'];
    }

    _websocketMarketId (symbol) {
        return this.marketId (symbol).toLowerCase ();
    }

    _websocketOnOpen (contextId, websocketOptions) { // eslint-disable-line no-unused-vars
        let symbolIds = {};
        this._contextSet (contextId, 'symbolids', symbolIds);
    }

    _websocketOnMessage (contextId, data) {
        let msg = JSON.parse (data);
        let channelId = msg[0];
        // if channelId is not one of the above, check if it is a marketId
        let symbolsIds = this._contextGet (contextId, 'symbolids');
        let channelIdStr = channelId.toString ();
        if (channelIdStr in symbolsIds) {
            // both 'ob' and 'trade' are handled by the same execution branch
            // as on poloniex they are part of the same endpoint
            let symbol = symbolsIds[channelIdStr];
            this._websocketHandleOb (contextId, symbol, msg);
        } else {
            // Some error occured
            this.emit ('err', new ExchangeError (this.id + '._websocketOnMessage() failed to get symbol for channelId: ' + channelIdStr));
            this.websocketClose (contextId);
        }
    }

    _websocketParseTrade (trade, symbol) {
        // Websocket trade format different than REST trade format
        let id = trade[1];
        let side = (trade[2] === 1) ? 'buy' : 'sell';
        let price = parseFloat (trade[3]);
        let amount = parseFloat (trade[4]);
        let timestamp = trade[5] * 1000; // ms resolution
        return {
            'id': id,
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': undefined,
            'side': side,
            'price': price,
            'amount': amount,
        };
    }

    _websocketHandleOb (contextId, symbol, data) {
        // Poloniex calls this Price Aggregated Book
        // let channelId = data[0];
        let sequenceNumber = data[1];
        if (data.length > 2) {
            let orderbook = data[2];
            // let symbol = this.findSymbol (channelId.toString ());
            // Check if this is the first response which contains full current orderbook
            if (orderbook[0][0] === 'i') {
                if (!this._contextIsSubscribed (contextId, 'ob', symbol)) {
                    return;
                }
                let symbolData = this._contextGetSymbolData (contextId, 'ob', symbol);
                // let currencyPair = orderbook[0][1]['currencyPair'];
                let fullOrderbook = orderbook[0][1]['orderBook'];
                let asks = [];
                let bids = [];
                let keys = [];
                let i = 0;
                keys = Object.keys (fullOrderbook[0]);
                for (i = 0; i < keys.length; i++) {
                    asks.push ([parseFloat (keys[i]), parseFloat (fullOrderbook[0][keys[i]])]);
                }
                keys = Object.keys (fullOrderbook[1]);
                for (i = 0; i < keys.length; i++) {
                    bids.push ([parseFloat (keys[i]), parseFloat (fullOrderbook[1][keys[i]])]);
                }
                fullOrderbook = {
                    'asks': asks,
                    'bids': bids,
                    'isFrozen': 0,
                    'seq': sequenceNumber,
                };
                // I decided not to push the initial orderbook to cache.
                // This way is less consistent but I think it's easier.
                fullOrderbook = this.parseOrderBook (fullOrderbook);
                fullOrderbook = this._cloneOrderBook (fullOrderbook, symbolData['limit']);
                fullOrderbook['obLastSequenceNumber'] = sequenceNumber;
                symbolData['ob'] = fullOrderbook;
                this._contextSetSymbolData (contextId, 'ob', symbol, symbolData);
                this.emit ('ob', symbol, symbolData['ob']);
            } else {
                let order = undefined;
                let orderbookDelta = {
                    'asks': [],
                    'bids': [],
                    'seq': sequenceNumber,
                };
                let price = 0.0;
                let amount = 0.0;
                let i = 0;
                for (i = 0; i < orderbook.length; i++) {
                    order = orderbook[i];
                    if (order[0] === 'o') {
                        price = parseFloat (order[2]);
                        amount = parseFloat (order[3]);
                        if (order[1] === 0) {
                            // sell order
                            orderbookDelta['asks'].push ([price, amount]);
                        } else if (order[1] === 1) {
                            // buy order
                            orderbookDelta['bids'].push ([price, amount]);
                        } else {
                            // error
                            this.emit ('err', new ExchangeError (this.id + '._websocketHandleOb() unknown value in buy/sell field. Expected 0 or 1 but got: ' + order[1]));
                            this.websocketClose (contextId);
                            return;
                        }
                    } else if (order[0] === 't') {
                        // this is not an order but a trade
                        if (this._contextIsSubscribed (contextId, 'trade', symbol)) {
                            let trade = this._websocketParseTrade (order, symbol);
                            this.emit ('trade', symbol, trade);
                        }
                        continue;
                    } else {
                        // unknown value
                        this.emit ('err', new ExchangeError (this.id + '._websocketHandleOb() unknown value in order/trade field. Expected \'o\' or \'t\' but got: ' + order[0]));
                        this.websocketClose (contextId);
                        return;
                    }
                }
                if (!this._contextIsSubscribed (contextId, 'ob', symbol)) {
                    return;
                }
                // Add to cache
                orderbookDelta = this.parseOrderBook (orderbookDelta);
                let symbolData = this._contextGetSymbolData (contextId, 'ob', symbol);
                if (typeof (symbolData['obDeltaCache']) === 'undefined') {
                    // This check is necessary because the obDeltaCache will be deleted on a call to fetchOrderBook()
                    symbolData['obDeltaCache'] = {}; // make empty cache
                    symbolData['obDeltaCacheSize'] = 0; // counting number of cached deltas
                }
                symbolData['obDeltaCacheSize'] += 1;
                let sequenceNumberStr = sequenceNumber.toString ();
                symbolData['obDeltaCache'][sequenceNumberStr] = orderbookDelta;
                // Schedule call to _websocketOrderBookDeltaCache()
                this._websocketHandleObDeltaCache (contextId, symbol);
                this.emit ('ob', symbol, symbolData['ob']);
            }
        }
    }

    _websocketHandleObDeltaCache (contextId, symbol) {
        let symbolData = this._contextGetSymbolData (contextId, 'ob', symbol);
        // Handle out-of-order sequenceNumber
        // To avoid a memory leak, we must put a maximum on the size of obDeltaCache.
        // When this maximum is reached, we accept that we have lost some orderbook updates.
        // In this case we must fetch a new orderbook.
        // Alternatively, we could apply all cached deltas and keep going.
        if (symbolData['obDeltaCacheSize'] > symbolData['obDeltaCacheSizeMax']) {
            symbolData['ob'] = this.fetchOrderBook (symbol, symbolData['limit']);
            // delete symbolData['obDeltaCache'];
            symbolData['obDeltaCache'] = undefined;
            symbolData['obDeltaCacheSize'] = 0;
            this._contextSetSymbolData (contextId, 'ob', symbol, symbolData);
            return;
        }
        if (symbolData['obDeltaCacheSize'] === 0) {
            this._contextSetSymbolData (contextId, 'ob', symbol, symbolData);
            return;
        }
        // if the cache exists
        // check if the next sequenceNumber is in the cache
        let fullOrderbook = symbolData['ob'];
        let lastSequenceNumber = fullOrderbook['obLastSequenceNumber'];
        let cachedSequenceNumber = lastSequenceNumber + 1;
        let cachedSequenceNumberStr = cachedSequenceNumber.toString ();
        let orderbookDelta = symbolData['obDeltaCache'][cachedSequenceNumberStr];
        let continueBool = typeof orderbookDelta !== 'undefined';
        // While loop is not transpiled properly
        // while (continueBool) {
        let nkeys = symbolData['obDeltaCacheSize'];
        let i = 0;
        for (i = 0; i < nkeys; i++) {
            if (!continueBool) {
                break;
            }
            symbolData['obDeltaCache'][cachedSequenceNumberStr] = undefined;
            fullOrderbook = this.mergeOrderBookDelta (symbolData['ob'], orderbookDelta);
            fullOrderbook = this._cloneOrderBook (fullOrderbook, symbolData['limit']);
            fullOrderbook['obLastSequenceNumber'] = cachedSequenceNumber;
            symbolData['ob'] = fullOrderbook;
            cachedSequenceNumber += 1;
            orderbookDelta = symbolData['obDeltaCache'][cachedSequenceNumberStr];
            continueBool = typeof orderbookDelta !== 'undefined';
            symbolData['obDeltaCacheSize'] -= 1;
        }
        this._contextSetSymbolData (contextId, 'ob', symbol, symbolData);
    }

    _websocketSubscribeOb (contextId, event, symbol, nonce, params = {}) {
        let symbolData = this._contextGetSymbolData (contextId, 'ob', symbol);
        symbolData['limit'] = this.safeInteger (params, 'limit', undefined);
        symbolData['obDeltaCache'] = undefined;
        symbolData['obDeltaCacheSize'] = 0;
        symbolData['obDeltaCacheSizeMax'] = this.safeInteger (params, 'obDeltaCacheSizeMax', 10);
        this._contextSetSymbolData (contextId, 'ob', symbol, symbolData);
        // get symbol id2
        // let market = this.marketId (symbol);
        if (!this._contextIsSubscribed (contextId, 'trade', symbol)) {
            let market = this.findMarket (symbol);
            let symbolsIds = this._contextGet (contextId, 'symbolids');
            symbolsIds[market['id2']] = symbol;
            this._contextSet (contextId, 'symbolids', symbolsIds);
            let payload = {
                'command': 'subscribe',
                'channel': market['id'],
            };
            this.websocketSendJson (payload);
        }
        let nonceStr = nonce.toString ();
        this.emit (nonceStr, true);
    }

    _websocketSubscribeTrade (contextId, event, symbol, nonce, params = {}) {
        if (!this._contextIsSubscribed (contextId, 'ob', symbol)) {
            let market = this.findMarket (symbol);
            let symbolsIds = this._contextGet (contextId, 'symbolids');
            symbolsIds[market['id2']] = symbol;
            this._contextSet (contextId, 'symbolids', symbolsIds);
            let payload = {
                'command': 'subscribe',
                'channel': market['id'],
            };
            this.websocketSendJson (payload);
        }
        let nonceStr = nonce.toString ();
        this.emit (nonceStr, true);
    }

    _websocketSubscribe (contextId, event, symbol, nonce, params = {}) {
        if (event === 'ob') {
            this._websocketSubscribeOb (contextId, event, symbol, nonce, params);
        } else if (event === 'trade') {
            this._websocketSubscribeTrade (contextId, event, symbol, nonce, params);
        } else {
            throw new NotSupported ('subscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
    }

    _websocketUnsubscribeOb (conxid, event, symbol, nonce, params) {
        if (!this._contextIsSubscribed (conxid, 'trade', symbol)) {
            let market = this.marketId (symbol);
            let payload = {
                'command': 'unsubscribe',
                'channel': market,
            };
            this.websocketSendJson (payload);
        }
        let nonceStr = nonce.toString ();
        this.emit (nonceStr, true);
    }

    _websocketUnsubscribeTrade (conxid, event, symbol, nonce, params) {
        if (!this._contextIsSubscribed (conxid, 'ob', symbol)) {
            let market = this.marketId (symbol);
            let payload = {
                'command': 'unsubscribe',
                'channel': market,
            };
            this.websocketSendJson (payload);
        }
        let nonceStr = nonce.toString ();
        this.emit (nonceStr, true);
    }

    _websocketUnsubscribe (conxid, event, symbol, nonce, params) {
        if (event === 'ob') {
            this._websocketUnsubscribeOb (conxid, event, symbol, nonce, params);
        } else if (event === 'trade') {
            this._websocketUnsubscribeTrade (conxid, event, symbol, nonce, params);
        } else {
            throw new NotSupported ('subscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
    }

    _getCurrentWebsocketOrderbook (contextId, symbol, limit) {
        let data = this._contextGetSymbolData (contextId, 'ob', symbol);
        if (('ob' in data) && (typeof data['ob'] !== 'undefined')) {
            return this._cloneOrderBook (data['ob'], limit);
        }
        return undefined;
    }
};
