'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { AuthenticationError, BadRequest, DDoSProtection, ExchangeError, ExchangeNotAvailable, InsufficientFunds, InvalidOrder, OrderNotFound, PermissionDenied, NotSupported } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class bitmex extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'bitmex',
            'name': 'BitMEX',
            'countries': [ 'SC' ], // Seychelles
            'version': 'v1',
            'userAgent': undefined,
            'rateLimit': 2000,
            'has': {
                'CORS': false,
                'fetchOHLCV': true,
                'withdraw': true,
                'editOrder': true,
                'fetchOrder': true,
                'fetchOrders': true,
                'fetchOpenOrders': true,
                'fetchClosedOrders': true,
                'fetchMyTrades': true,
            },
            'timeframes': {
                '1m': '1m',
                '5m': '5m',
                '1h': '1h',
                '1d': '1d',
            },
            'urls': {
                'test': 'https://testnet.bitmex.com',
                'logo': 'https://user-images.githubusercontent.com/1294454/27766319-f653c6e6-5ed4-11e7-933d-f0bc3699ae8f.jpg',
                'api': 'https://www.bitmex.com',
                'www': 'https://www.bitmex.com',
                'doc': [
                    'https://www.bitmex.com/app/apiOverview',
                    'https://github.com/BitMEX/api-connectors/tree/master/official-http',
                ],
                'fees': 'https://www.bitmex.com/app/fees',
                'referral': 'https://www.bitmex.com/register/rm3C16',
            },
            'api': {
                'public': {
                    'get': [
                        'announcement',
                        'announcement/urgent',
                        'funding',
                        'instrument',
                        'instrument/active',
                        'instrument/activeAndIndices',
                        'instrument/activeIntervals',
                        'instrument/compositeIndex',
                        'instrument/indices',
                        'insurance',
                        'leaderboard',
                        'liquidation',
                        'orderBook',
                        'orderBook/L2',
                        'quote',
                        'quote/bucketed',
                        'schema',
                        'schema/websocketHelp',
                        'settlement',
                        'stats',
                        'stats/history',
                        'trade',
                        'trade/bucketed',
                    ],
                },
                'private': {
                    'get': [
                        'apiKey',
                        'chat',
                        'chat/channels',
                        'chat/connected',
                        'execution',
                        'execution/tradeHistory',
                        'notification',
                        'order',
                        'position',
                        'user',
                        'user/affiliateStatus',
                        'user/checkReferralCode',
                        'user/commission',
                        'user/depositAddress',
                        'user/margin',
                        'user/minWithdrawalFee',
                        'user/wallet',
                        'user/walletHistory',
                        'user/walletSummary',
                    ],
                    'post': [
                        'apiKey',
                        'apiKey/disable',
                        'apiKey/enable',
                        'chat',
                        'order',
                        'order/bulk',
                        'order/cancelAllAfter',
                        'order/closePosition',
                        'position/isolate',
                        'position/leverage',
                        'position/riskLimit',
                        'position/transferMargin',
                        'user/cancelWithdrawal',
                        'user/confirmEmail',
                        'user/confirmEnableTFA',
                        'user/confirmWithdrawal',
                        'user/disableTFA',
                        'user/logout',
                        'user/logoutAll',
                        'user/preferences',
                        'user/requestEnableTFA',
                        'user/requestWithdrawal',
                    ],
                    'put': [
                        'order',
                        'order/bulk',
                        'user',
                    ],
                    'delete': [
                        'apiKey',
                        'order',
                        'order/all',
                    ],
                },
            },
            'wsconf': {
                'conx-tpls': {
                    'default': {
                        'type': 'ws',
                        'baseurl': 'wss://www.bitmex.com/realtime',
                    },
                },
                'methodmap': {
                    '_websocketTimeoutSendPing': '_websocketTimeoutSendPing',
                    '_websocketTimeoutRemoveNonce': '_websocketTimeoutRemoveNonce',
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
            'exceptions': {
                'exact': {
                    'Invalid API Key.': AuthenticationError,
                    'Access Denied': PermissionDenied,
                    'Duplicate clOrdID': InvalidOrder,
                    'orderQty is invalid': InvalidOrder,
                    'Invalid price': InvalidOrder,
                    'Invalid stopPx for ordType': InvalidOrder,
                },
                'broad': {
                    'Signature not valid': AuthenticationError,
                    'overloaded': ExchangeNotAvailable,
                    'Account has insufficient Available Balance': InsufficientFunds,
                },
            },
            'options': {
                // https://blog.bitmex.com/api_announcement/deprecation-of-api-nonce-header/
                // https://github.com/ccxt/ccxt/issues/4789
                'api-expires': 5, // in seconds
            },
        });
    }

    async fetchMarkets (params = {}) {
        const response = await this.publicGetInstrumentActiveAndIndices (params);
        const result = [];
        for (let i = 0; i < response.length; i++) {
            const market = response[i];
            const active = (market['state'] !== 'Unlisted');
            const id = market['symbol'];
            const baseId = market['underlying'];
            const quoteId = market['quoteCurrency'];
            const basequote = baseId + quoteId;
            const base = this.commonCurrencyCode (baseId);
            const quote = this.commonCurrencyCode (quoteId);
            const swap = (id === basequote);
            // 'positionCurrency' may be empty ("", as Bitmex currently returns for ETHUSD)
            // so let's take the quote currency first and then adjust if needed
            const positionId = this.safeString2 (market, 'positionCurrency', 'quoteCurrency');
            let type = undefined;
            let future = false;
            let prediction = false;
            let position = this.commonCurrencyCode (positionId);
            let symbol = id;
            if (swap) {
                type = 'swap';
                symbol = base + '/' + quote;
            } else if (id.indexOf ('B_') >= 0) {
                prediction = true;
                type = 'prediction';
            } else {
                future = true;
                type = 'future';
            }
            const precision = {
                'amount': undefined,
                'price': undefined,
            };
            const lotSize = this.safeFloat (market, 'lotSize');
            const tickSize = this.safeFloat (market, 'tickSize');
            if (lotSize !== undefined) {
                precision['amount'] = this.precisionFromString (this.truncate_to_string (lotSize, 16));
            }
            if (tickSize !== undefined) {
                precision['price'] = this.precisionFromString (this.truncate_to_string (tickSize, 16));
            }
            const limits = {
                'amount': {
                    'min': undefined,
                    'max': undefined,
                },
                'price': {
                    'min': tickSize,
                    'max': this.safeFloat (market, 'maxPrice'),
                },
                'cost': {
                    'min': undefined,
                    'max': undefined,
                },
            };
            const limitField = (position === quote) ? 'cost' : 'amount';
            limits[limitField] = {
                'min': lotSize,
                'max': this.safeFloat (market, 'maxOrderQty'),
            };
            result.push ({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'active': active,
                'precision': precision,
                'limits': limits,
                'taker': market['takerFee'],
                'maker': market['makerFee'],
                'type': type,
                'spot': false,
                'swap': swap,
                'future': future,
                'prediction': prediction,
                'info': market,
            });
        }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        const request = { 'currency': 'all' };
        const response = await this.privateGetUserMargin (this.extend (request, params));
        const result = { 'info': response };
        for (let b = 0; b < response.length; b++) {
            const balance = response[b];
            let currencyId = this.safeString (balance, 'currency');
            currencyId = currencyId.toUpperCase ();
            const code = this.commonCurrencyCode (currencyId);
            const account = {
                'free': balance['availableMargin'],
                'used': 0.0,
                'total': balance['marginBalance'],
            };
            if (code === 'BTC') {
                account['free'] = account['free'] * 0.00000001;
                account['total'] = account['total'] * 0.00000001;
            }
            account['used'] = account['total'] - account['free'];
            result[code] = account;
        }
        return this.parseBalance (result);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (limit !== undefined)
            request['depth'] = limit;
        let orderbook = await this.publicGetOrderBookL2 (this.extend (request, params));
        let result = {
            'bids': [],
            'asks': [],
            'timestamp': undefined,
            'datetime': undefined,
            'nonce': undefined,
        };
        for (let o = 0; o < orderbook.length; o++) {
            let order = orderbook[o];
            let side = (order['side'] === 'Sell') ? 'asks' : 'bids';
            let amount = this.safeFloat (order, 'size');
            let price = this.safeFloat (order, 'price');
            // https://github.com/ccxt/ccxt/issues/4926
            // https://github.com/ccxt/ccxt/issues/4927
            // the exchange sometimes returns null price in the orderbook
            if (price !== undefined) {
                result[side].push ([ price, amount ]);
            }
        }
        result['bids'] = this.sortBy (result['bids'], 0, true);
        result['asks'] = this.sortBy (result['asks'], 0);
        return result;
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        let filter = { 'filter': { 'orderID': id }};
        let result = await this.fetchOrders (symbol, undefined, undefined, this.deepExtend (filter, params));
        let numResults = result.length;
        if (numResults === 1)
            return result[0];
        throw new OrderNotFound (this.id + ': The order ' + id + ' not found.');
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        let request = {};
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['symbol'] = market['id'];
        }
        if (since !== undefined)
            request['startTime'] = this.iso8601 (since);
        if (limit !== undefined)
            request['count'] = limit;
        request = this.deepExtend (request, params);
        // why the hassle? urlencode in python is kinda broken for nested dicts.
        // E.g. self.urlencode({"filter": {"open": True}}) will return "filter={'open':+True}"
        // Bitmex doesn't like that. Hence resorting to this hack.
        if ('filter' in request)
            request['filter'] = this.json (request['filter']);
        let response = await this.privateGetOrder (request);
        return this.parseOrders (response, market, since, limit);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let filter_params = { 'filter': { 'open': true }};
        return await this.fetchOrders (symbol, since, limit, this.deepExtend (filter_params, params));
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        // Bitmex barfs if you set 'open': false in the filter...
        let orders = await this.fetchOrders (symbol, since, limit, params);
        return this.filterBy (orders, 'status', 'closed');
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        let request = {};
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['symbol'] = market['id'];
        }
        if (since !== undefined)
            request['startTime'] = this.iso8601 (since);
        if (limit !== undefined)
            request['count'] = limit;
        request = this.deepExtend (request, params);
        // why the hassle? urlencode in python is kinda broken for nested dicts.
        // E.g. self.urlencode({"filter": {"open": True}}) will return "filter={'open':+True}"
        // Bitmex doesn't like that. Hence resorting to this hack.
        if ('filter' in request) {
            request['filter'] = this.json (request['filter']);
        }
        let response = await this.privateGetExecutionTradeHistory (request);
        //
        //     [
        //         {
        //             "execID": "string",
        //             "orderID": "string",
        //             "clOrdID": "string",
        //             "clOrdLinkID": "string",
        //             "account": 0,
        //             "symbol": "string",
        //             "side": "string",
        //             "lastQty": 0,
        //             "lastPx": 0,
        //             "underlyingLastPx": 0,
        //             "lastMkt": "string",
        //             "lastLiquidityInd": "string",
        //             "simpleOrderQty": 0,
        //             "orderQty": 0,
        //             "price": 0,
        //             "displayQty": 0,
        //             "stopPx": 0,
        //             "pegOffsetValue": 0,
        //             "pegPriceType": "string",
        //             "currency": "string",
        //             "settlCurrency": "string",
        //             "execType": "string",
        //             "ordType": "string",
        //             "timeInForce": "string",
        //             "execInst": "string",
        //             "contingencyType": "string",
        //             "exDestination": "string",
        //             "ordStatus": "string",
        //             "triggered": "string",
        //             "workingIndicator": true,
        //             "ordRejReason": "string",
        //             "simpleLeavesQty": 0,
        //             "leavesQty": 0,
        //             "simpleCumQty": 0,
        //             "cumQty": 0,
        //             "avgPx": 0,
        //             "commission": 0,
        //             "tradePublishIndicator": "string",
        //             "multiLegReportingType": "string",
        //             "text": "string",
        //             "trdMatchID": "string",
        //             "execCost": 0,
        //             "execComm": 0,
        //             "homeNotional": 0,
        //             "foreignNotional": 0,
        //             "transactTime": "2019-03-05T12:47:02.762Z",
        //             "timestamp": "2019-03-05T12:47:02.762Z"
        //         }
        //     ]
        //
        return this.parseTrades (response, market, since, limit);
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        if (!market['active']) {
            throw new ExchangeError (this.id + ': symbol ' + symbol + ' is delisted');
        }
        const tickers = await this.fetchTickers ([ symbol ], params);
        const ticker = this.safeValue (tickers, symbol);
        if (ticker === undefined) {
            throw new ExchangeError (this.id + ' ticker symbol ' + symbol + ' not found');
        }
        return ticker;
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        const response = await this.publicGetInstrumentActiveAndIndices (params);
        const result = {};
        for (let i = 0; i < response.length; i++) {
            const ticker = this.parseTicker (response[i]);
            const symbol = this.safeString (ticker, 'symbol');
            if (symbol !== undefined) {
                result[symbol] = ticker;
            }
        }
        return result;
    }

    parseTicker (ticker, market = undefined) {
        //
        //     {                         symbol: "ETHH19",
        //                           rootSymbol: "ETH",
        //                                state: "Open",
        //                                  typ: "FFCCSX",
        //                              listing: "2018-12-17T04:00:00.000Z",
        //                                front: "2019-02-22T12:00:00.000Z",
        //                               expiry: "2019-03-29T12:00:00.000Z",
        //                               settle: "2019-03-29T12:00:00.000Z",
        //                       relistInterval:  null,
        //                           inverseLeg: "",
        //                              sellLeg: "",
        //                               buyLeg: "",
        //                     optionStrikePcnt:  null,
        //                    optionStrikeRound:  null,
        //                    optionStrikePrice:  null,
        //                     optionMultiplier:  null,
        //                     positionCurrency: "ETH",
        //                           underlying: "ETH",
        //                        quoteCurrency: "XBT",
        //                     underlyingSymbol: "ETHXBT=",
        //                            reference: "BMEX",
        //                      referenceSymbol: ".BETHXBT30M",
        //                         calcInterval:  null,
        //                      publishInterval:  null,
        //                          publishTime:  null,
        //                          maxOrderQty:  100000000,
        //                             maxPrice:  10,
        //                              lotSize:  1,
        //                             tickSize:  0.00001,
        //                           multiplier:  100000000,
        //                        settlCurrency: "XBt",
        //       underlyingToPositionMultiplier:  1,
        //         underlyingToSettleMultiplier:  null,
        //              quoteToSettleMultiplier:  100000000,
        //                             isQuanto:  false,
        //                            isInverse:  false,
        //                           initMargin:  0.02,
        //                          maintMargin:  0.01,
        //                            riskLimit:  5000000000,
        //                             riskStep:  5000000000,
        //                                limit:  null,
        //                               capped:  false,
        //                                taxed:  true,
        //                           deleverage:  true,
        //                             makerFee:  -0.0005,
        //                             takerFee:  0.0025,
        //                        settlementFee:  0,
        //                         insuranceFee:  0,
        //                    fundingBaseSymbol: "",
        //                   fundingQuoteSymbol: "",
        //                 fundingPremiumSymbol: "",
        //                     fundingTimestamp:  null,
        //                      fundingInterval:  null,
        //                          fundingRate:  null,
        //                indicativeFundingRate:  null,
        //                   rebalanceTimestamp:  null,
        //                    rebalanceInterval:  null,
        //                     openingTimestamp: "2019-02-13T08:00:00.000Z",
        //                     closingTimestamp: "2019-02-13T09:00:00.000Z",
        //                      sessionInterval: "2000-01-01T01:00:00.000Z",
        //                       prevClosePrice:  0.03347,
        //                       limitDownPrice:  null,
        //                         limitUpPrice:  null,
        //               bankruptLimitDownPrice:  null,
        //                 bankruptLimitUpPrice:  null,
        //                      prevTotalVolume:  1386531,
        //                          totalVolume:  1387062,
        //                               volume:  531,
        //                            volume24h:  17118,
        //                    prevTotalTurnover:  4741294246000,
        //                        totalTurnover:  4743103466000,
        //                             turnover:  1809220000,
        //                          turnover24h:  57919845000,
        //                      homeNotional24h:  17118,
        //                   foreignNotional24h:  579.19845,
        //                         prevPrice24h:  0.03349,
        //                                 vwap:  0.03383564,
        //                            highPrice:  0.03458,
        //                             lowPrice:  0.03329,
        //                            lastPrice:  0.03406,
        //                   lastPriceProtected:  0.03406,
        //                    lastTickDirection: "ZeroMinusTick",
        //                       lastChangePcnt:  0.017,
        //                             bidPrice:  0.03406,
        //                             midPrice:  0.034065,
        //                             askPrice:  0.03407,
        //                       impactBidPrice:  0.03406,
        //                       impactMidPrice:  0.034065,
        //                       impactAskPrice:  0.03407,
        //                         hasLiquidity:  true,
        //                         openInterest:  83679,
        //                            openValue:  285010674000,
        //                           fairMethod: "ImpactMidPrice",
        //                        fairBasisRate:  0,
        //                            fairBasis:  0,
        //                            fairPrice:  0.03406,
        //                           markMethod: "FairPrice",
        //                            markPrice:  0.03406,
        //                    indicativeTaxRate:  0,
        //                indicativeSettlePrice:  0.03406,
        //                optionUnderlyingPrice:  null,
        //                         settledPrice:  null,
        //                            timestamp: "2019-02-13T08:40:30.000Z",
        //     }
        //
        let symbol = undefined;
        const marketId = this.safeString (ticker, 'symbol');
        market = this.safeValue (this.markets_by_id, marketId, market);
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        const timestamp = this.parse8601 (this.safeString (ticker, 'timestamp'));
        const open = this.safeFloat (ticker, 'prevPrice24h');
        const last = this.safeFloat (ticker, 'lastPrice');
        let change = undefined;
        let percentage = undefined;
        if (last !== undefined && open !== undefined) {
            change = last - open;
            if (open > 0) {
                percentage = change / open * 100;
            }
        }
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'highPrice'),
            'low': this.safeFloat (ticker, 'lowPrice'),
            'bid': this.safeFloat (ticker, 'bidPrice'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'askPrice'),
            'askVolume': undefined,
            'vwap': this.safeFloat (ticker, 'vwap'),
            'open': open,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': change,
            'percentage': percentage,
            'average': this.sum (open, last) / 2,
            'baseVolume': this.safeFloat (ticker, 'homeNotional24h'),
            'quoteVolume': this.safeFloat (ticker, 'foreignNotional24h'),
            'info': ticker,
        };
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        let timestamp = this.parse8601 (ohlcv['timestamp']);
        return [
            timestamp,
            this.safeFloat (ohlcv, 'open'),
            this.safeFloat (ohlcv, 'high'),
            this.safeFloat (ohlcv, 'low'),
            this.safeFloat (ohlcv, 'close'),
            this.safeFloat (ohlcv, 'volume'),
        ];
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        // send JSON key/value pairs, such as {"key": "value"}
        // filter by individual fields and do advanced queries on timestamps
        // let filter = { 'key': 'value' };
        // send a bare series (e.g. XBU) to nearest expiring contract in that series
        // you can also send a timeframe, e.g. XBU:monthly
        // timeframes: daily, weekly, monthly, quarterly, and biquarterly
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
            'binSize': this.timeframes[timeframe],
            'partial': true,     // true == include yet-incomplete current bins
            // 'filter': filter, // filter by individual fields and do advanced queries
            // 'columns': [],    // will return all columns if omitted
            // 'start': 0,       // starting point for results (wtf?)
            // 'reverse': false, // true == newest first
            // 'endTime': '',    // ending date filter for results
        };
        if (limit !== undefined)
            request['count'] = limit; // default 100, max 500
        // if since is not set, they will return candles starting from 2017-01-01
        if (since !== undefined) {
            let ymdhms = this.ymdhms (since);
            request['startTime'] = ymdhms; // starting date filter for results
        }
        let response = await this.publicGetTradeBucketed (this.extend (request, params));
        return this.parseOHLCVs (response, market, timeframe, since, limit);
    }

    parseTrade (trade, market = undefined) {
        //
        // fetchTrades (public)
        //
        //     {
        //         timestamp: '2018-08-28T00:00:02.735Z',
        //         symbol: 'XBTUSD',
        //         side: 'Buy',
        //         size: 2000,
        //         price: 6906.5,
        //         tickDirection: 'PlusTick',
        //         trdMatchID: 'b9a42432-0a46-6a2f-5ecc-c32e9ca4baf8',
        //         grossValue: 28958000,
        //         homeNotional: 0.28958,
        //         foreignNotional: 2000
        //     }
        //
        // fetchMyTrades (private)
        //
        //     {
        //         "execID": "string",
        //         "orderID": "string",
        //         "clOrdID": "string",
        //         "clOrdLinkID": "string",
        //         "account": 0,
        //         "symbol": "string",
        //         "side": "string",
        //         "lastQty": 0,
        //         "lastPx": 0,
        //         "underlyingLastPx": 0,
        //         "lastMkt": "string",
        //         "lastLiquidityInd": "string",
        //         "simpleOrderQty": 0,
        //         "orderQty": 0,
        //         "price": 0,
        //         "displayQty": 0,
        //         "stopPx": 0,
        //         "pegOffsetValue": 0,
        //         "pegPriceType": "string",
        //         "currency": "string",
        //         "settlCurrency": "string",
        //         "execType": "string",
        //         "ordType": "string",
        //         "timeInForce": "string",
        //         "execInst": "string",
        //         "contingencyType": "string",
        //         "exDestination": "string",
        //         "ordStatus": "string",
        //         "triggered": "string",
        //         "workingIndicator": true,
        //         "ordRejReason": "string",
        //         "simpleLeavesQty": 0,
        //         "leavesQty": 0,
        //         "simpleCumQty": 0,
        //         "cumQty": 0,
        //         "avgPx": 0,
        //         "commission": 0,
        //         "tradePublishIndicator": "string",
        //         "multiLegReportingType": "string",
        //         "text": "string",
        //         "trdMatchID": "string",
        //         "execCost": 0,
        //         "execComm": 0,
        //         "homeNotional": 0,
        //         "foreignNotional": 0,
        //         "transactTime": "2019-03-05T12:47:02.762Z",
        //         "timestamp": "2019-03-05T12:47:02.762Z"
        //     }
        //
        let timestamp = this.parse8601 (this.safeString (trade, 'timestamp'));
        let price = this.safeFloat (trade, 'price');
        let amount = this.safeFloat2 (trade, 'size', 'lastQty');
        let id = this.safeString (trade, 'trdMatchID');
        let order = this.safeString (trade, 'orderID');
        let side = this.safeString (trade, 'side').toLowerCase ();
        // price * amount doesn't work for all symbols (e.g. XBT, ETH)
        let cost = this.safeFloat (trade, 'execCost');
        if (cost !== undefined) {
            cost = Math.abs (cost) / 100000000;
        }
        let fee = undefined;
        if ('execComm' in trade) {
            let feeCost = this.safeFloat (trade, 'execComm');
            feeCost = feeCost / 100000000;
            let currencyId = this.safeString (trade, 'currency');
            currencyId = currencyId.toUpperCase ();
            const feeCurrency = this.commonCurrencyCode (currencyId);
            let feeRate = this.safeFloat (trade, 'commission');
            fee = {
                'cost': feeCost,
                'currency': feeCurrency,
                'rate': feeRate,
            };
        }
        let takerOrMaker = undefined;
        if (fee !== undefined) {
            takerOrMaker = fee['cost'] < 0 ? 'maker' : 'taker';
        }
        let symbol = undefined;
        const marketId = this.safeString (trade, 'symbol');
        if (marketId !== undefined) {
            if (marketId in this.markets_by_id) {
                market = this.markets_by_id[marketId];
                symbol = market['symbol'];
            } else {
                symbol = marketId;
            }
        }
        return {
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'id': id,
            'order': order,
            'type': undefined,
            'takerOrMaker': takerOrMaker,
            'side': side,
            'price': price,
            'cost': cost,
            'amount': amount,
            'fee': fee,
        };
    }

    parseOrderStatus (status) {
        let statuses = {
            'New': 'open',
            'PartiallyFilled': 'open',
            'Filled': 'closed',
            'DoneForDay': 'open',
            'Canceled': 'canceled',
            'PendingCancel': 'open',
            'PendingNew': 'open',
            'Rejected': 'rejected',
            'Expired': 'expired',
            'Stopped': 'open',
            'Untriggered': 'open',
            'Triggered': 'open',
        };
        return this.safeString (statuses, status, status);
    }

    parseOrder (order, market = undefined) {
        let status = this.parseOrderStatus (this.safeString (order, 'ordStatus'));
        let symbol = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
        } else {
            let id = order['symbol'];
            if (id in this.markets_by_id) {
                market = this.markets_by_id[id];
                symbol = market['symbol'];
            }
        }
        let timestamp = this.parse8601 (this.safeString (order, 'timestamp'));
        let lastTradeTimestamp = this.parse8601 (this.safeString (order, 'transactTime'));
        let price = this.safeFloat (order, 'price');
        let amount = this.safeFloat (order, 'orderQty');
        let filled = this.safeFloat (order, 'cumQty', 0.0);
        let remaining = undefined;
        if (amount !== undefined) {
            if (filled !== undefined) {
                remaining = Math.max (amount - filled, 0.0);
            }
        }
        const average = this.safeFloat (order, 'avgPx');
        let cost = undefined;
        if (filled !== undefined) {
            if (average !== undefined) {
                cost = average * filled;
            } else if (price !== undefined) {
                cost = price * filled;
            }
        }
        let result = {
            'info': order,
            'id': order['orderID'].toString (),
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': lastTradeTimestamp,
            'symbol': symbol,
            'type': order['ordType'].toLowerCase (),
            'side': order['side'].toLowerCase (),
            'price': price,
            'amount': amount,
            'cost': cost,
            'average': average,
            'filled': filled,
            'remaining': remaining,
            'status': status,
            'fee': undefined,
        };
        return result;
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (since !== undefined) {
            request['startTime'] = this.iso8601 (since);
        }
        if (limit !== undefined) {
            request['count'] = limit;
        }
        let response = await this.publicGetTrade (this.extend (request, params));
        //
        //     [
        //         {
        //             timestamp: '2018-08-28T00:00:02.735Z',
        //             symbol: 'XBTUSD',
        //             side: 'Buy',
        //             size: 2000,
        //             price: 6906.5,
        //             tickDirection: 'PlusTick',
        //             trdMatchID: 'b9a42432-0a46-6a2f-5ecc-c32e9ca4baf8',
        //             grossValue: 28958000,
        //             homeNotional: 0.28958,
        //             foreignNotional: 2000
        //         },
        //         {
        //             timestamp: '2018-08-28T00:00:03.778Z',
        //             symbol: 'XBTUSD',
        //             side: 'Sell',
        //             size: 1000,
        //             price: 6906,
        //             tickDirection: 'MinusTick',
        //             trdMatchID: '0d4f1682-5270-a800-569b-4a0eb92db97c',
        //             grossValue: 14480000,
        //             homeNotional: 0.1448,
        //             foreignNotional: 1000
        //         },
        //     ]
        //
        return this.parseTrades (response, market, since, limit);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {
            'symbol': this.marketId (symbol),
            'side': this.capitalize (side),
            'orderQty': amount,
            'ordType': this.capitalize (type),
        };
        if (price !== undefined)
            request['price'] = price;
        let response = await this.privatePostOrder (this.extend (request, params));
        let order = this.parseOrder (response);
        let id = order['id'];
        this.orders[id] = order;
        return this.extend ({ 'info': response }, order);
    }

    async editOrder (id, symbol, type, side, amount = undefined, price = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {
            'orderID': id,
        };
        if (amount !== undefined)
            request['orderQty'] = amount;
        if (price !== undefined)
            request['price'] = price;
        let response = await this.privatePutOrder (this.extend (request, params));
        let order = this.parseOrder (response);
        this.orders[order['id']] = order;
        return this.extend ({ 'info': response }, order);
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let response = await this.privateDeleteOrder (this.extend ({ 'orderID': id }, params));
        let order = response[0];
        let error = this.safeString (order, 'error');
        if (error !== undefined)
            if (error.indexOf ('Unable to cancel order due to existing state') >= 0)
                throw new OrderNotFound (this.id + ' cancelOrder() failed: ' + error);
        order = this.parseOrder (order);
        this.orders[order['id']] = order;
        return this.extend ({ 'info': response }, order);
    }

    isFiat (currency) {
        if (currency === 'EUR')
            return true;
        if (currency === 'PLN')
            return true;
        return false;
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        await this.loadMarkets ();
        // let currency = this.currency (code);
        if (code !== 'BTC') {
            throw new ExchangeError (this.id + ' supoprts BTC withdrawals only, other currencies coming soon...');
        }
        let request = {
            'currency': 'XBt', // temporarily
            'amount': amount,
            'address': address,
            // 'otpToken': '123456', // requires if two-factor auth (OTP) is enabled
            // 'fee': 0.001, // bitcoin network fee
        };
        let response = await this.privatePostUserRequestWithdrawal (this.extend (request, params));
        return {
            'info': response,
            'id': response['transactID'],
        };
    }

    handleErrors (code, reason, url, method, headers, body, response) {
        if (code === 429)
            throw new DDoSProtection (this.id + ' ' + body);
        if (code >= 400) {
            if (body) {
                if (body[0] === '{') {
                    const error = this.safeValue (response, 'error', {});
                    const message = this.safeString (error, 'message');
                    const feedback = this.id + ' ' + body;
                    const exact = this.exceptions['exact'];
                    if (message in exact) {
                        throw new exact[message] (feedback);
                    }
                    const broad = this.exceptions['broad'];
                    const broadKey = this.findBroadlyMatchedKey (broad, message);
                    if (broadKey !== undefined) {
                        throw new broad[broadKey] (feedback);
                    }
                    if (code === 400) {
                        throw new BadRequest (feedback);
                    }
                    throw new ExchangeError (feedback); // unknown message
                }
            }
        }
    }

    nonce () {
        return this.milliseconds ();
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let query = '/api/' + this.version + '/' + path;
        if (method === 'GET') {
            if (Object.keys (params).length) {
                query += '?' + this.urlencode (params);
            }
        } else {
            const format = this.safeString (params, '_format');
            if (format !== undefined) {
                query += '?' + this.urlencode ({ '_format': format });
                params = this.omit (params, '_format');
            }
        }
        let url = this.urls['api'] + query;
        if (api === 'private') {
            this.checkRequiredCredentials ();
            let auth = method + query;
            let expires = this.safeInteger (this.options, 'api-expires');
            headers = {
                'Content-Type': 'application/json',
                'api-key': this.apiKey,
            };
            expires = this.sum (this.seconds (), expires);
            expires = expires.toString ();
            auth += expires;
            headers['api-expires'] = expires;
            if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
                if (Object.keys (params).length) {
                    body = this.json (params);
                    auth += body;
                }
            }
            headers['api-signature'] = this.hmac (this.encode (auth), this.encode (this.secret));
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    _websocketOnOpen (contextId, websocketOptions) { // eslint-disable-line no-unused-vars
        let lastTimer = this._contextGet (contextId, 'timer');
        if (typeof lastTimer !== 'undefined') {
            this._cancelTimeout (lastTimer);
        }
        lastTimer = this._setTimeout (contextId, 5000, this._websocketMethodMap ('_websocketTimeoutSendPing'), []);
        this._contextSet (contextId, 'timer', lastTimer);
        let dbids = {};
        this._contextSet (contextId, 'dbids', dbids);
        // send auth
        // let nonce = this.nonce ();
        // let signature = this.hmac (this.encode ('GET/realtime' + nonce.toString ()), this.encode (this.secret));
        // let payload = {
        //     'op': 'authKeyExpires',
        //     'args': [this.apiKey, nonce, signature]
        //  };
        // this.asyncSendJson (payload);
    }

    _websocketOnMessage (contextId, data) {
        // send ping after 5 seconds if not message received
        if (data === 'pong') {
            return;
        }
        let msg = JSON.parse (data);
        let table = this.safeString (msg, 'table');
        let subscribe = this.safeString (msg, 'subscribe');
        let unsubscribe = this.safeString (msg, 'unsubscribe');
        let status = this.safeInteger (msg, 'status');
        if (typeof subscribe !== 'undefined') {
            this._websocketHandleSubscription (contextId, msg);
        } else if (typeof unsubscribe !== 'undefined') {
            this._websocketHandleUnsubscription (contextId, msg);
        } else if (typeof table !== 'undefined') {
            if (table === 'orderBookL2') {
                this._websocketHandleOb (contextId, msg);
            } else if (table === 'trade') {
                this._websocketHandleTrade (contextId, msg);
            }
        } else if (typeof status !== 'undefined') {
            this._websocketHandleError (contextId, msg);
        }
    }

    _websocketTimeoutSendPing () {
        this.websocketSend ('ping');
    }

    _websocketHandleError (contextId, msg) {
        let status = this.safeInteger (msg, 'status');
        let error = this.safeString (msg, 'error');
        this.emit ('err', new ExchangeError (this.id + ' status ' + status + ':' + error), contextId);
    }

    _websocketHandleSubscription (contextId, msg) {
        let success = this.safeValue (msg, 'success');
        let subscribe = this.safeString (msg, 'subscribe');
        let parts = subscribe.split (':');
        let partsLen = parts.length;
        let event = undefined;
        if (partsLen === 2) {
            if (parts[0] === 'orderBookL2') {
                event = 'ob';
            } else if (parts[0] === 'trade') {
                event = 'trade';
            } else {
                event = undefined;
            }
            if (typeof event !== 'undefined') {
                let symbol = this.findSymbol (parts[1]);
                let symbolData = this._contextGetSymbolData (contextId, event, symbol);
                if ('sub-nonces' in symbolData) {
                    let nonces = symbolData['sub-nonces'];
                    const keys = Object.keys (nonces);
                    for (let i = 0; i < keys.length; i++) {
                        let nonce = keys[i];
                        this._cancelTimeout (nonces[nonce]);
                        this.emit (nonce, success);
                    }
                    symbolData['sub-nonces'] = {};
                    this._contextSetSymbolData (contextId, event, symbol, symbolData);
                }
            }
        }
    }

    _websocketHandleUnsubscription (contextId, msg) {
        let success = this.safeValue (msg, 'success');
        let unsubscribe = this.safeString (msg, 'unsubscribe');
        let parts = unsubscribe.split (':');
        let partsLen = parts.length;
        let event = undefined;
        if (partsLen === 2) {
            if (parts[0] === 'orderBookL2') {
                event = 'ob';
            } else if (parts[0] === 'trade') {
                event = 'trade';
            } else {
                event = undefined;
            }
            if (typeof event !== 'undefined') {
                let symbol = this.findSymbol (parts[1]);
                if (success && event === 'ob') {
                    let dbids = this._contextGet (contextId, 'dbids');
                    if (symbol in dbids) {
                        this.omit (dbids, symbol);
                        this._contextSet (contextId, 'dbids', dbids);
                    }
                }
                let symbolData = this._contextGetSymbolData (contextId, event, symbol);
                if ('unsub-nonces' in symbolData) {
                    let nonces = symbolData['unsub-nonces'];
                    const keys = Object.keys (nonces);
                    for (let i = 0; i < keys.length; i++) {
                        let nonce = keys[i];
                        this._cancelTimeout (nonces[nonce]);
                        this.emit (nonce, success);
                    }
                    symbolData['unsub-nonces'] = {};
                    this._contextSetSymbolData (contextId, event, symbol, symbolData);
                }
            }
        }
    }

    _websocketHandleTrade (contextId, msg) {
        let data = this.safeValue (msg, 'data');
        if (typeof data === 'undefined' || data.length === 0) {
            return;
        }
        let symbol = this.safeString (data[0], 'symbol');
        let trades = this.parseTrades (data);
        symbol = this.findSymbol (symbol);
        for (let t = 0; t < trades.length; t++) {
            this.emit ('trade', symbol, trades[t]);
        }
    }

    _websocketHandleOb (contextId, msg) {
        let action = this.safeString (msg, 'action');
        let data = this.safeValue (msg, 'data');
        let symbol = this.safeString (data[0], 'symbol');
        let dbids = this._contextGet (contextId, 'dbids');
        let symbolData = this._contextGetSymbolData (contextId, 'ob', symbol);
        symbol = this.findSymbol (symbol);
        if (action === 'partial') {
            let ob = {
                'bids': [],
                'asks': [],
                'timestamp': undefined,
                'datetime': undefined,
                'nonce': undefined,
            };
            let obIds = {};
            for (let o = 0; o < data.length; o++) {
                let order = data[o];
                let side = (order['side'] === 'Sell') ? 'asks' : 'bids';
                let amount = order['size'];
                let price = order['price'];
                let priceId = order['id'];
                ob[side].push ([ price, amount ]);
                obIds[priceId] = price;
            }
            ob['bids'] = this.sortBy (ob['bids'], 0, true);
            ob['asks'] = this.sortBy (ob['asks'], 0);
            symbolData['ob'] = ob;
            dbids[symbol] = obIds;
            this.emit ('ob', symbol, this._cloneOrderBook (ob, symbolData['limit']));
        } else if (action === 'update') {
            if (symbol in dbids) {
                let obIds = dbids[symbol];
                let curob = symbolData['ob'];
                for (let o = 0; o < data.length; o++) {
                    let order = data[o];
                    let amount = order['size'];
                    let side = (order['side'] === 'Sell') ? 'asks' : 'bids';
                    let priceId = order['id'];
                    let price = obIds[priceId];
                    this.updateBidAsk ([price, amount], curob[side], order['side'] === 'Buy');
                }
                symbolData['ob'] = curob;
                this.emit ('ob', symbol, this._cloneOrderBook (curob, symbolData['limit']));
            }
        } else if (action === 'insert') {
            if (symbol in dbids) {
                let curob = symbolData['ob'];
                for (let o = 0; o < data.length; o++) {
                    let order = data[o];
                    let amount = order['size'];
                    let side = (order['side'] === 'Sell') ? 'asks' : 'bids';
                    let priceId = order['id'];
                    let price = order['price'];
                    this.updateBidAsk ([price, amount], curob[side], order['side'] === 'Buy');
                    dbids[symbol][priceId] = price;
                }
                symbolData['ob'] = curob;
                this.emit ('ob', symbol, this._cloneOrderBook (curob, symbolData['limit']));
            }
        } else if (action === 'delete') {
            if (symbol in dbids) {
                let obIds = dbids[symbol];
                let curob = symbolData['ob'];
                for (let o = 0; o < data.length; o++) {
                    let order = data[o];
                    let side = (order['side'] === 'Sell') ? 'asks' : 'bids';
                    let priceId = order['id'];
                    let price = obIds[priceId];
                    this.updateBidAsk ([price, 0], curob[side], order['side'] === 'Buy');
                    this.omit (dbids[symbol], priceId);
                }
                symbolData['ob'] = curob;
                this.emit ('ob', symbol, this._cloneOrderBook (curob, symbolData['limit']));
            }
        } else {
            this.emit ('err', new ExchangeError (this.id + ' invalid orderbook message'));
        }
        this._contextSet (contextId, 'dbids', dbids);
        this._contextSetSymbolData (contextId, 'ob', symbol, symbolData);
    }

    _websocketSubscribe (contextId, event, symbol, nonce, params = {}) {
        if (event !== 'ob' && event !== 'trade') {
            throw new NotSupported ('subscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
        let id = this.market_id (symbol).toUpperCase ();
        let payload = undefined;
        if (event === 'ob') {
            payload = {
                'op': 'subscribe',
                'args': ['orderBookL2:' + id],
            };
        } else if (event === 'trade') {
            payload = {
                'op': 'subscribe',
                'args': ['trade:' + id],
            };
        }
        let symbolData = this._contextGetSymbolData (contextId, event, symbol);
        if (!('sub-nonces' in symbolData)) {
            symbolData['sub-nonces'] = {};
        }
        symbolData['limit'] = this.safeInteger (params, 'limit', undefined);
        let nonceStr = nonce.toString ();
        let handle = this._setTimeout (contextId, this.timeout, this._websocketMethodMap ('_websocketTimeoutRemoveNonce'), [contextId, nonceStr, event, symbol, 'sub-nonce']);
        symbolData['sub-nonces'][nonceStr] = handle;
        this._contextSetSymbolData (contextId, event, symbol, symbolData);
        this.websocketSendJson (payload);
    }

    _websocketUnsubscribe (contextId, event, symbol, nonce, params = {}) {
        if (event !== 'ob' && event !== 'trade') {
            throw new NotSupported ('unsubscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
        let id = this.market_id (symbol).toUpperCase ();
        let payload = undefined;
        if (event === 'ob') {
            payload = {
                'op': 'unsubscribe',
                'args': ['orderBookL2:' + id],
            };
        } else if (event === 'trade') {
            payload = {
                'op': 'unsubscribe',
                'args': ['trade:' + id],
            };
        }
        let symbolData = this._contextGetSymbolData (contextId, event, symbol);
        if (!('unsub-nonces' in symbolData)) {
            symbolData['unsub-nonces'] = {};
        }
        let nonceStr = nonce.toString ();
        let handle = this._setTimeout (contextId, this.timeout, this._websocketMethodMap ('_websocketTimeoutRemoveNonce'), [contextId, nonceStr, event, symbol, 'unsub-nonces']);
        symbolData['unsub-nonces'][nonceStr] = handle;
        this._contextSetSymbolData (contextId, event, symbol, symbolData);
        this.websocketSendJson (payload);
    }

    _websocketTimeoutRemoveNonce (contextId, timerNonce, event, symbol, key) {
        let symbolData = this._contextGetSymbolData (contextId, event, symbol);
        if (key in symbolData) {
            let nonces = symbolData[key];
            if (timerNonce in nonces) {
                this.omit (symbolData[key], timerNonce);
                this._contextSetSymbolData (contextId, event, symbol, symbolData);
            }
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
