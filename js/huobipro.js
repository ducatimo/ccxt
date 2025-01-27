'use strict';

//  ---------------------------------------------------------------------------

const CryptoJS = require('crypto-js')
const Exchange = require('./base/Exchange');
const moment = require('moment');
const { ArgumentsRequired, AuthenticationError, ExchangeError, ExchangeNotAvailable, InvalidOrder, OrderNotFound, InsufficientFunds, NotSupported } = require('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class huobipro extends Exchange {
    describe() {
        return this.deepExtend(super.describe(), {
            'id': 'huobipro',
            'name': 'Huobi Pro',
            'countries': ['CN'],
            'rateLimit': 2000,
            'userAgent': this.userAgents['chrome39'],
            'version': 'v1',
            'accounts': undefined,
            'accountsById': undefined,
            'hostname': 'api.huobi.pro',
            'has': {
                'CORS': false,
                'fetchTickers': true,
                'fetchDepositAddress': true,
                'fetchOHLCV': true,
                'fetchOrder': true,
                'fetchOrders': true,
                'fetchOpenOrders': true,
                'fetchClosedOrders': true,
                'fetchTradingLimits': true,
                'fetchMyTrades': true,
                'withdraw': true,
                'fetchCurrencies': true,
                'fetchDeposits': true,
                'fetchWithdrawals': true,
            },
            'timeframes': {
                '1m': '1min',
                '5m': '5min',
                '15m': '15min',
                '30m': '30min',
                '1h': '60min',
                '1d': '1day',
                '1w': '1week',
                '1M': '1mon',
                '1y': '1year',
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27766569-15aa7b9a-5edd-11e7-9e7f-44791f4ee49c.jpg',
                'api': {
                    'market': 'https://api.huobi.pro',
                    'public': 'https://api.huobi.pro',
                    'private': 'https://api.huobi.pro',
                    'zendesk': 'https://huobiglobal.zendesk.com/hc/en-us/articles',
                },
                'www': 'https://www.huobi.pro',
                'referral': 'https://www.huobi.br.com/en-us/topic/invited/?invite_code=rwrd3',
                'doc': 'https://github.com/huobiapi/API_Docs/wiki/REST_api_reference',
                'fees': 'https://www.huobi.pro/about/fee/',
            },
            'api': {
                'zendesk': {
                    'get': [
                        '360000400491-Trade-Limits',
                    ],
                },
                'market': {
                    'get': [
                        'history/kline', // 获取K线数据
                        'detail/merged', // 获取聚合行情(Ticker)
                        'depth', // 获取 Market Depth 数据
                        'trade', // 获取 Trade Detail 数据
                        'history/trade', // 批量获取最近的交易记录
                        'detail', // 获取 Market Detail 24小时成交量数据
                        'tickers',
                    ],
                },
                'public': {
                    'get': [
                        'common/symbols', // 查询系统支持的所有交易对
                        'common/currencys', // 查询系统支持的所有币种
                        'common/timestamp', // 查询系统当前时间
                        'common/exchange', // order limits
                        'settings/currencys', // ?language=en-US
                    ],
                },
                'private': {
                    'get': [
                        'account/accounts', // 查询当前用户的所有账户(即account-id)
                        'account/accounts/{id}/balance', // 查询指定账户的余额
                        'order/orders/{id}', // 查询某个订单详情
                        'order/orders/{id}/matchresults', // 查询某个订单的成交明细
                        'order/orders', // 查询当前委托、历史委托
                        'order/matchresults', // 查询当前成交、历史成交
                        'dw/withdraw-virtual/addresses', // 查询虚拟币提现地址
                        'dw/deposit-virtual/addresses',
                        'dw/deposit-virtual/sharedAddressWithTag', // https://github.com/ccxt/ccxt/issues/4851
                        'query/deposit-withdraw',
                        'margin/loan-orders', // 借贷订单
                        'margin/accounts/balance', // 借贷账户详情
                        'points/actions',
                        'points/orders',
                        'subuser/aggregate-balance',
                    ],
                    'post': [
                        'order/orders/place', // 创建并执行一个新订单 (一步下单， 推荐使用)
                        'order/orders', // 创建一个新的订单请求 （仅创建订单，不执行下单）
                        'order/orders/{id}/place', // 执行一个订单 （仅执行已创建的订单）
                        'order/orders/{id}/submitcancel', // 申请撤销一个订单请求
                        'order/orders/batchCancelOpenOrders', // 批量撤销订单
                        'dw/balance/transfer', // 资产划转
                        'dw/withdraw/api/create', // 申请提现虚拟币
                        'dw/withdraw-virtual/create', // 申请提现虚拟币
                        'dw/withdraw-virtual/{id}/place', // 确认申请虚拟币提现
                        'dw/withdraw-virtual/{id}/cancel', // 申请取消提现虚拟币
                        'dw/transfer-in/margin', // 现货账户划入至借贷账户
                        'dw/transfer-out/margin', // 借贷账户划出至现货账户
                        'margin/orders', // 申请借贷
                        'margin/orders/{id}/repay', // 归还借贷
                        'subuser/transfer',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'maker': 0.002,
                    'taker': 0.002,
                },
            },
            'exceptions': {
                'gateway-internal-error': ExchangeNotAvailable, // {"status":"error","err-code":"gateway-internal-error","err-msg":"Failed to load data. Try again later.","data":null}
                'account-frozen-balance-insufficient-error': InsufficientFunds, // {"status":"error","err-code":"account-frozen-balance-insufficient-error","err-msg":"trade account balance is not enough, left: `0.0027`","data":null}
                'invalid-amount': InvalidOrder, // eg "Paramemter `amount` is invalid."
                'order-limitorder-amount-min-error': InvalidOrder, // limit order amount error, min: `0.001`
                'order-marketorder-amount-min-error': InvalidOrder, // market order amount error, min: `0.01`
                'order-limitorder-price-min-error': InvalidOrder, // limit order price error
                'order-limitorder-price-max-error': InvalidOrder, // limit order price error
                'order-orderstate-error': OrderNotFound, // canceling an already canceled order
                'order-queryorder-invalid': OrderNotFound, // querying a non-existent order
                'order-update-error': ExchangeNotAvailable, // undocumented error
                'api-signature-check-failed': AuthenticationError,
                'api-signature-not-valid': AuthenticationError, // {"status":"error","err-code":"api-signature-not-valid","err-msg":"Signature not valid: Incorrect Access key [Access key错误]","data":null}
            },
            'options': {
                'createMarketBuyOrderRequiresPrice': true,
                'fetchMarketsMethod': 'publicGetCommonSymbols',
                'fetchBalanceMethod': 'privateGetAccountAccountsIdBalance',
                'createOrderMethod': 'privatePostOrderOrdersPlace',
                'language': 'en-US',
            },
            'wsconf': {
                'conx-tpls': {
                    'default': {
                        'type': 'ws',
                        'baseurl': 'wss://api.huobi.pro/ws',
                    },
                    'secure': {
                        'type': 'ws',
                        'baseurl': 'wss://api.huobi.pro/ws/v1',
                        'private': true,
                        'wait4readyEvent': 'authorized'
                    }
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
                    'detail': {
                        'conx-tpl': 'default',
                        'conx-param': {
                            'url': '{baseurl}',
                            'id': '{id}',
                        },
                    },
                    'orders': {
                        'conx-tpl': 'secure',
                        'conx-param': {
                            'url': '{baseurl}',
                            'id': '{id}',
                        },
                    },
                    'balance': {
                        'conx-tpl': 'secure',
                        'conx-param': {
                            'url': '{baseurl}',
                            'id': '{id}',
                        },
                    },
                },
            },
            'commonCurrencies': {
                'HOT': 'Hydro Protocol', // conflict with HOT (Holo) https://github.com/ccxt/ccxt/issues/4929
            },
        });
    }

    async fetchTradingLimits(symbols = undefined, params = {}) {
        // this method should not be called directly, use loadTradingLimits () instead
        //  by default it will try load withdrawal fees of all currencies (with separate requests)
        //  however if you define symbols = [ 'ETH/BTC', 'LTC/BTC' ] in args it will only load those
        await this.loadMarkets();
        if (symbols === undefined) {
            symbols = this.symbols;
        }
        let result = {};
        for (let i = 0; i < symbols.length; i++) {
            let symbol = symbols[i];
            result[symbol] = await this.fetchTradingLimitsById(this.marketId(symbol), params);
        }
        return result;
    }

    async fetchTradingLimitsById(id, params = {}) {
        let request = {
            'symbol': id,
        };
        let response = await this.publicGetCommonExchange(this.extend(request, params));
        //
        //     { status:   "ok",
        //         data: {                                  symbol: "aidocbtc",
        //                              'buy-limit-must-less-than':  1.1,
        //                          'sell-limit-must-greater-than':  0.9,
        //                         'limit-order-must-greater-than':  1,
        //                            'limit-order-must-less-than':  5000000,
        //                    'market-buy-order-must-greater-than':  0.0001,
        //                       'market-buy-order-must-less-than':  100,
        //                   'market-sell-order-must-greater-than':  1,
        //                      'market-sell-order-must-less-than':  500000,
        //                       'circuit-break-when-greater-than':  10000,
        //                          'circuit-break-when-less-than':  10,
        //                 'market-sell-order-rate-must-less-than':  0.1,
        //                  'market-buy-order-rate-must-less-than':  0.1        } }
        //
        return this.parseTradingLimits(this.safeValue(response, 'data', {}));
    }

    parseTradingLimits(limits, symbol = undefined, params = {}) {
        //
        //   {                                  symbol: "aidocbtc",
        //                  'buy-limit-must-less-than':  1.1,
        //              'sell-limit-must-greater-than':  0.9,
        //             'limit-order-must-greater-than':  1,
        //                'limit-order-must-less-than':  5000000,
        //        'market-buy-order-must-greater-than':  0.0001,
        //           'market-buy-order-must-less-than':  100,
        //       'market-sell-order-must-greater-than':  1,
        //          'market-sell-order-must-less-than':  500000,
        //           'circuit-break-when-greater-than':  10000,
        //              'circuit-break-when-less-than':  10,
        //     'market-sell-order-rate-must-less-than':  0.1,
        //      'market-buy-order-rate-must-less-than':  0.1        }
        //
        return {
            'info': limits,
            'limits': {
                'amount': {
                    'min': this.safeFloat(limits, 'limit-order-must-greater-than'),
                    'max': this.safeFloat(limits, 'limit-order-must-less-than'),
                },
            },
        };
    }

    async fetchMarkets(params = {}) {
        let method = this.options['fetchMarketsMethod'];
        let response = await this[method]();
        let markets = response['data'];
        let numMarkets = markets.length;
        if (numMarkets < 1)
            throw new ExchangeError(this.id + ' publicGetCommonSymbols returned empty response: ' + this.json(markets));
        let result = [];
        for (let i = 0; i < markets.length; i++) {
            let market = markets[i];
            let baseId = market['base-currency'];
            let quoteId = market['quote-currency'];
            let base = baseId.toUpperCase();
            let quote = quoteId.toUpperCase();
            let id = baseId + quoteId;
            base = this.commonCurrencyCode(base);
            quote = this.commonCurrencyCode(quote);
            let symbol = base + '/' + quote;
            let precision = {
                'amount': market['amount-precision'],
                'price': market['price-precision'],
            };
            let maker = (base === 'OMG') ? 0 : 0.2 / 100;
            let taker = (base === 'OMG') ? 0 : 0.2 / 100;
            result.push({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'active': true,
                'precision': precision,
                'taker': taker,
                'maker': maker,
                'limits': {
                    'amount': {
                        'min': Math.pow(10, -precision['amount']),
                        'max': undefined,
                    },
                    'price': {
                        'min': Math.pow(10, -precision['price']),
                        'max': undefined,
                    },
                    'cost': {
                        'min': 0,
                        'max': undefined,
                    },
                },
                'info': market,
            });
        }
        return result;
    }

    parseTicker(ticker, market = undefined) {
        let symbol = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        let timestamp = this.safeInteger(ticker, 'ts');
        let bid = undefined;
        let ask = undefined;
        let bidVolume = undefined;
        let askVolume = undefined;
        if ('bid' in ticker) {
            if (Array.isArray(ticker['bid'])) {
                bid = this.safeFloat(ticker['bid'], 0);
                bidVolume = this.safeFloat(ticker['bid'], 1);
            }
        }
        if ('ask' in ticker) {
            if (Array.isArray(ticker['ask'])) {
                ask = this.safeFloat(ticker['ask'], 0);
                askVolume = this.safeFloat(ticker['ask'], 1);
            }
        }
        let open = this.safeFloat(ticker, 'open');
        let close = this.safeFloat(ticker, 'close');
        let change = undefined;
        let percentage = undefined;
        let average = undefined;
        if ((open !== undefined) && (close !== undefined)) {
            change = close - open;
            average = this.sum(open, close) / 2;
            if ((close !== undefined) && (close > 0)) {
                percentage = (change / open) * 100;
            }
        }
        let baseVolume = this.safeFloat(ticker, 'amount');
        let quoteVolume = this.safeFloat(ticker, 'vol');
        let vwap = undefined;
        if (baseVolume !== undefined && quoteVolume !== undefined && baseVolume > 0) {
            vwap = quoteVolume / baseVolume;
        }
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'high': this.safeFloat(ticker, 'high'),
            'low': this.safeFloat(ticker, 'low'),
            'bid': bid,
            'bidVolume': bidVolume,
            'ask': ask,
            'askVolume': askVolume,
            'vwap': vwap,
            'open': open,
            'close': close,
            'last': close,
            'previousClose': undefined,
            'change': change,
            'percentage': percentage,
            'average': average,
            'baseVolume': baseVolume,
            'quoteVolume': quoteVolume,
            'info': ticker,
        };
    }

    async fetchOrderBook(symbol, limit = undefined, params = {}) {
        await this.loadMarkets();
        let market = this.market(symbol);
        let response = await this.marketGetDepth(this.extend({
            'symbol': market['id'],
            'type': 'step0',
        }, params));
        if ('tick' in response) {
            if (!response['tick']) {
                throw new ExchangeError(this.id + ' fetchOrderBook() returned empty response: ' + this.json(response));
            }
            let orderbook = response['tick'];
            let result = this.parseOrderBook(orderbook, orderbook['ts']);
            result['nonce'] = orderbook['version'];
            return result;
        }
        throw new ExchangeError(this.id + ' fetchOrderBook() returned unrecognized response: ' + this.json(response));
    }

    async fetchTicker(symbol, params = {}) {
        await this.loadMarkets();
        let market = this.market(symbol);
        let response = await this.marketGetDetailMerged(this.extend({
            'symbol': market['id'],
        }, params));
        return this.parseTicker(response['tick'], market);
    }

    async fetchTickers(symbols = undefined, params = {}) {
        await this.loadMarkets();
        let response = await this.marketGetTickers(params);
        let tickers = response['data'];
        let timestamp = this.safeInteger(response, 'ts');
        let result = {};
        for (let i = 0; i < tickers.length; i++) {
            let marketId = this.safeString(tickers[i], 'symbol');
            let market = this.safeValue(this.markets_by_id, marketId);
            let symbol = marketId;
            if (market !== undefined) {
                symbol = market['symbol'];
                let ticker = this.parseTicker(tickers[i], market);
                ticker['timestamp'] = timestamp;
                ticker['datetime'] = this.iso8601(timestamp);
                result[symbol] = ticker;
            }
        }
        return result;
    }

    parseTrade(trade, market = undefined) {
        let symbol = undefined;
        if (market === undefined) {
            let marketId = this.safeString(trade, 'symbol');
            if (marketId in this.markets_by_id) {
                market = this.markets_by_id[marketId];
            }
        }
        if (market !== undefined)
            symbol = market['symbol'];
        let timestamp = this.safeInteger2(trade, 'ts', 'created-at');
        let order = this.safeString(trade, 'order-id');
        let side = this.safeString(trade, 'direction');
        let type = this.safeString(trade, 'type');
        if (type !== undefined) {
            let typeParts = type.split('-');
            side = typeParts[0];
            type = typeParts[1];
        }
        let price = this.safeFloat(trade, 'price');
        let amount = this.safeFloat2(trade, 'filled-amount', 'amount');
        let cost = undefined;
        if (price !== undefined) {
            if (amount !== undefined) {
                cost = amount * price;
            }
        }
        let fee = undefined;
        let feeCost = this.safeFloat(trade, 'filled-fees');
        let feeCurrency = undefined;
        if (market !== undefined) {
            feeCurrency = (side === 'buy') ? market['base'] : market['quote'];
        }
        let filledPoints = this.safeFloat(trade, 'filled-points');
        if (filledPoints !== undefined) {
            if ((feeCost === undefined) || (feeCost === 0.0)) {
                feeCost = filledPoints;
                feeCurrency = this.commonCurrencyCode('HBPOINT');
            }
        }
        if (feeCost !== undefined) {
            fee = {
                'cost': feeCost,
                'currency': feeCurrency,
            };
        }
        return {
            'info': trade,
            'id': this.safeString(trade, 'id'),
            'order': order,
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'amount': amount,
            'cost': cost,
            'fee': fee,
        };
    }

    async fetchMyTrades(symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets();
        let response = await this.privateGetOrderMatchresults(params);
        let trades = this.parseTrades(response['data'], undefined, since, limit);
        if (symbol !== undefined) {
            let market = this.market(symbol);
            trades = this.filterBySymbol(trades, market['symbol']);
        }
        return trades;
    }

    async fetchTrades(symbol, since = undefined, limit = 1000, params = {}) {
        await this.loadMarkets();
        let market = this.market(symbol);
        let request = {
            'symbol': market['id'],
        };
        if (limit !== undefined)
            request['size'] = limit;
        let response = await this.marketGetHistoryTrade(this.extend(request, params));
        let data = response['data'];
        let result = [];
        for (let i = 0; i < data.length; i++) {
            let trades = data[i]['data'];
            for (let j = 0; j < trades.length; j++) {
                let trade = this.parseTrade(trades[j], market);
                result.push(trade);
            }
        }
        result = this.sortBy(result, 'timestamp');
        return this.filterBySymbolSinceLimit(result, symbol, since, limit);
    }

    parseOHLCV(ohlcv, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        return [
            ohlcv['id'] * 1000,
            ohlcv['open'],
            ohlcv['high'],
            ohlcv['low'],
            ohlcv['close'],
            ohlcv['amount'],
        ];
    }

    async fetchOHLCV(symbol, timeframe = '1m', since = undefined, limit = 1000, params = {}) {
        await this.loadMarkets();
        let market = this.market(symbol);
        let request = {
            'symbol': market['id'],
            'period': this.timeframes[timeframe],
        };
        if (limit !== undefined) {
            request['size'] = limit;
        }
        let response = await this.marketGetHistoryKline(this.extend(request, params));
        return this.parseOHLCVs(response['data'], market, timeframe, since, limit);
    }

    async fetchAccounts(params = {}) {
        await this.loadMarkets();
        let response = await this.privateGetAccountAccounts(params);
        return response['data'];
    }

    async fetchCurrencies(params = {}) {
        let response = await this.publicGetSettingsCurrencys(this.extend({
            'language': this.options['language'],
        }, params));
        let currencies = response['data'];
        let result = {};
        for (let i = 0; i < currencies.length; i++) {
            let currency = currencies[i];
            //
            //  {                     name: "ctxc",
            //              'display-name': "CTXC",
            //        'withdraw-precision':  8,
            //             'currency-type': "eth",
            //        'currency-partition': "pro",
            //             'support-sites':  null,
            //                'otc-enable':  0,
            //        'deposit-min-amount': "2",
            //       'withdraw-min-amount': "4",
            //            'show-precision': "8",
            //                      weight: "2988",
            //                     visible:  true,
            //              'deposit-desc': "Please don’t deposit any other digital assets except CTXC t…",
            //             'withdraw-desc': "Minimum withdrawal amount: 4 CTXC. !>_<!For security reason…",
            //           'deposit-enabled':  true,
            //          'withdraw-enabled':  true,
            //    'currency-addr-with-tag':  false,
            //             'fast-confirms':  15,
            //             'safe-confirms':  30                                                             }
            //
            let id = this.safeValue(currency, 'name');
            let precision = this.safeInteger(currency, 'withdraw-precision');
            let code = this.commonCurrencyCode(id.toUpperCase());
            let active = currency['visible'] && currency['deposit-enabled'] && currency['withdraw-enabled'];
            result[code] = {
                'id': id,
                'code': code,
                'type': 'crypto',
                // 'payin': currency['deposit-enabled'],
                // 'payout': currency['withdraw-enabled'],
                // 'transfer': undefined,
                'name': currency['display-name'],
                'active': active,
                'fee': undefined, // todo need to fetch from fee endpoint
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': Math.pow(10, -precision),
                        'max': Math.pow(10, precision),
                    },
                    'price': {
                        'min': Math.pow(10, -precision),
                        'max': Math.pow(10, precision),
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'deposit': {
                        'min': this.safeFloat(currency, 'deposit-min-amount'),
                        'max': Math.pow(10, precision),
                    },
                    'withdraw': {
                        'min': this.safeFloat(currency, 'withdraw-min-amount'),
                        'max': Math.pow(10, precision),
                    },
                },
                'info': currency,
            };
        }
        return result;
    }

    async fetchBalance(params = {}) {
        await this.loadMarkets();
        await this.loadAccounts();
        let method = this.options['fetchBalanceMethod'];
        let response = await this[method](this.extend({
            'id': this.accounts[0]['id'],
        }, params));
        let balances = response['data']['list'];
        let result = { 'info': response };
        for (let i = 0; i < balances.length; i++) {
            let balance = balances[i];
            let uppercase = balance['currency'].toUpperCase();
            let currency = this.commonCurrencyCode(uppercase);
            let account = undefined;
            if (currency in result)
                account = result[currency];
            else
                account = this.account();
            if (balance['type'] === 'trade')
                account['free'] = parseFloat(balance['balance']);
            if (balance['type'] === 'frozen')
                account['used'] = parseFloat(balance['balance']);
            account['total'] = this.sum(account['free'], account['used']);
            result[currency] = account;
        }
        return this.parseBalance(result);
    }

    async fetchOrdersByStates(states, symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets();
        let request = {
            'states': states,
        };
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market(symbol);
            request['symbol'] = market['id'];
        }
        let response = await this.privateGetOrderOrders(this.extend(request, params));
        //
        //     { status:   "ok",
        //         data: [ {                  id:  13997833014,
        //                                symbol: "ethbtc",
        //                          'account-id':  3398321,
        //                                amount: "0.045000000000000000",
        //                                 price: "0.034014000000000000",
        //                          'created-at':  1545836976871,
        //                                  type: "sell-limit",
        //                        'field-amount': "0.045000000000000000",
        //                   'field-cash-amount': "0.001530630000000000",
        //                          'field-fees': "0.000003061260000000",
        //                         'finished-at':  1545837948214,
        //                                source: "spot-api",
        //                                 state: "filled",
        //                         'canceled-at':  0                      }  ] }
        //
        return this.parseOrders(response['data'], market, since, limit);
    }

    async fetchOrders(symbol = undefined, since = undefined, limit = undefined, params = {}) {
        return await this.fetchOrdersByStates('pre-submitted,submitted,partial-filled,filled,partial-canceled,canceled', symbol, since, limit, params);
    }

    async fetchOpenOrders(symbol = undefined, since = undefined, limit = undefined, params = {}) {
        return await this.fetchOrdersByStates('pre-submitted,submitted,partial-filled', symbol, since, limit, params);
    }

    async fetchClosedOrders(symbol = undefined, since = undefined, limit = undefined, params = {}) {
        return await this.fetchOrdersByStates('filled,partial-canceled,canceled', symbol, since, limit, params);
    }

    async fetchOrder(id, symbol = undefined, params = {}) {
        await this.loadMarkets();
        let response = await this.privateGetOrderOrdersId(this.extend({
            'id': id,
        }, params));
        return this.parseOrder(response['data']);
    }

    parseOrderStatus(status) {
        let statuses = {
            'partial-filled': 'open',
            'partial-canceled': 'canceled',
            'filled': 'closed',
            'canceled': 'canceled',
            'submitted': 'open',
        };
        return this.safeString(statuses, status, status);
    }

    parseOrder(order, market = undefined) {
        //
        //     {                  id:  13997833014,
        //                    symbol: "ethbtc",
        //              'account-id':  3398321,
        //                    amount: "0.045000000000000000",
        //                     price: "0.034014000000000000",
        //              'created-at':  1545836976871,
        //                      type: "sell-limit",
        //            'field-amount': "0.045000000000000000",
        //       'field-cash-amount': "0.001530630000000000",
        //              'field-fees': "0.000003061260000000",
        //             'finished-at':  1545837948214,
        //                    source: "spot-api",
        //                     state: "filled",
        //             'canceled-at':  0                      }
        //
        //     {                  id:  20395337822,
        //                    symbol: "ethbtc",
        //              'account-id':  5685075,
        //                    amount: "0.001000000000000000",
        //                     price: "0.0",
        //              'created-at':  1545831584023,
        //                      type: "buy-market",
        //            'field-amount': "0.029100000000000000",
        //       'field-cash-amount': "0.000999788700000000",
        //              'field-fees': "0.000058200000000000",
        //             'finished-at':  1545831584181,
        //                    source: "spot-api",
        //                     state: "filled",
        //             'canceled-at':  0                      }
        //
        let id = this.safeString(order, 'id');
        let side = undefined;
        let type = undefined;
        let status = undefined;
        if ('type' in order) {
            let orderType = order['type'].split('-');
            side = orderType[0];
            type = orderType[1];
            status = this.parseOrderStatus(this.safeString(order, 'state'));
        }
        let symbol = undefined;
        if (market === undefined) {
            if ('symbol' in order) {
                if (order['symbol'] in this.markets_by_id) {
                    let marketId = order['symbol'];
                    market = this.markets_by_id[marketId];
                }
            }
        }
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        let timestamp = this.safeInteger(order, 'created-at');
        let amount = this.safeFloat(order, 'amount');
        let filled = this.safeFloat(order, 'field-amount'); // typo in their API, filled amount
        if ((type === 'market') && (side === 'buy')) {
            amount = (status === 'closed') ? filled : undefined;
        }
        let price = this.safeFloat(order, 'price');
        if (price === 0.0) {
            price = undefined;
        }
        let cost = this.safeFloat(order, 'field-cash-amount'); // same typo
        let remaining = undefined;
        let average = undefined;
        if (filled !== undefined) {
            if (amount !== undefined) {
                remaining = amount - filled;
            }
            // if cost is defined and filled is not zero
            if ((cost !== undefined) && (filled > 0)) {
                average = cost / filled;
            }
        }
        const feeCost = this.safeFloat(order, 'field-fees'); // typo in their API, filled fees
        let fee = undefined;
        if (feeCost !== undefined) {
            let feeCurrency = undefined;
            if (market !== undefined) {
                feeCurrency = (side === 'sell') ? market['quote'] : market['base'];
            }
            fee = {
                'cost': feeCost,
                'currency': feeCurrency,
            };
        }
        let result = {
            'info': order,
            'id': id,
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'lastTradeTimestamp': undefined,
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'average': average,
            'cost': cost,
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'status': status,
            'fee': fee,
        };
        return result;
    }

    async createOrder(symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets();
        await this.loadAccounts();
        let market = this.market(symbol);
        let request = {
            'account-id': this.accounts[0]['id'],
            'amount': this.amountToPrecision(symbol, amount),
            'symbol': market['id'],
            'type': side + '-' + type,
        };
        if (this.options['createMarketBuyOrderRequiresPrice']) {
            if ((type === 'market') && (side === 'buy')) {
                if (price === undefined) {
                    throw new InvalidOrder(this.id + " market buy order requires price argument to calculate cost (total amount of quote currency to spend for buying, amount * price). To switch off this warning exception and specify cost in the amount argument, set .options['createMarketBuyOrderRequiresPrice'] = false. Make sure you know what you're doing.");
                } else {
                    // despite that cost = amount * price is in quote currency and should have quote precision
                    // the exchange API requires the cost supplied in 'amount' to be of base precision
                    // more about it here: https://github.com/ccxt/ccxt/pull/4395
                    // we use priceToPrecision instead of amountToPrecision here
                    // because in this case the amount is in the quote currency
                    request['amount'] = this.priceToPrecision(symbol, parseFloat(amount) * parseFloat(price));
                }
            }
        }
        if (type === 'limit' || type === 'ioc' || type === 'limit-maker') {
            request['price'] = this.priceToPrecision(symbol, price);
        }
        let method = this.options['createOrderMethod'];
        let response = await this[method](this.extend(request, params));
        let timestamp = this.milliseconds();
        return {
            'info': response,
            'id': response['data'],
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'lastTradeTimestamp': undefined,
            'status': undefined,
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'amount': amount,
            'filled': undefined,
            'remaining': undefined,
            'cost': undefined,
            'trades': undefined,
            'fee': undefined,
        };
    }

    async cancelOrders(symbol) {
        symbol = symbol.toLowerCase();
        await this.loadAccounts();
        const response = await this.privatePostOrderOrdersBatchCancelOpenOrders({ 'account-id': this.accounts[0]['id'], 'symbol': symbol });
        //
        //     let response = {
        //         'status': 'ok',
        //         'data': '10138899000',
        //     };
        //
        return response;
    }

    async cancelOrder(id, symbol = undefined, params = {}) {
        const response = await this.privatePostOrderOrdersIdSubmitcancel({ 'id': id });
        //
        //     let response = {
        //         'status': 'ok',
        //         'data': '10138899000',
        //     };
        //
        return this.extend(this.parseOrder(response), {
            'id': id,
            'status': 'canceled',
        });
    }

    async fetchDepositAddress(code, params = {}) {
        await this.loadMarkets();
        const currency = this.currency(code);
        // if code == 'EOS':
        //     res = huobi.request('/dw/deposit-virtual/sharedAddressWithTag', 'private', 'GET', {'currency': 'eos', 'chain': 'eos1'})
        //     address_info = res['data']
        // else:
        //     address_info = self.broker.fetch_deposit_address(code)
        const request = {
            'currency': currency['id'].toLowerCase(),
        };
        // https://github.com/ccxt/ccxt/issues/4851
        const info = this.safeValue(currency, 'info', {});
        const currencyAddressWithTag = this.safeValue(info, 'currency-addr-with-tag');
        let method = 'privateGetDwDepositVirtualAddresses';
        if (currencyAddressWithTag) {
            method = 'privateGetDwDepositVirtualSharedAddressWithTag';
        }
        const response = await this[method](this.extend(request, params));
        //
        // privateGetDwDepositVirtualSharedAddressWithTag
        //
        //     {
        //         "status": "ok",
        //         "data": {
        //             "address": "huobideposit",
        //             "tag": "1937002"
        //         }
        //     }
        //
        // privateGetDwDepositVirtualAddresses
        //
        //     {
        //         "status": "ok",
        //         "data": "0xd7842ec9ba2bc20354e12f0e925a4e285a64187b"
        //     }
        //
        const data = this.safeValue(response, 'data');
        let address = undefined;
        let tag = undefined;
        if (currencyAddressWithTag) {
            address = this.safeString(data, 'address');
            tag = this.safeString(data, 'tag');
        } else {
            address = this.safeString(response, 'data');
        }
        this.checkAddress(address);
        return {
            'currency': code,
            'address': address,
            'tag': tag,
            'info': response,
        };
    }

    currencyToPrecision(currency, fee) {
        return this.decimalToPrecision(fee, 0, this.currencies[currency]['precision']);
    }

    calculateFee(symbol, type, side, amount, price, takerOrMaker = 'taker', params = {}) {
        let market = this.markets[symbol];
        let rate = market[takerOrMaker];
        let cost = amount * rate;
        let key = 'quote';
        if (side === 'sell') {
            cost *= price;
        } else {
            key = 'base';
        }
        return {
            'type': takerOrMaker,
            'currency': market[key],
            'rate': rate,
            'cost': parseFloat(this.currencyToPrecision(market[key], cost)),
        };
    }

    async withdraw(code, amount, address, tag = undefined, params = {}) {
        await this.loadMarkets();
        this.checkAddress(address);
        let currency = this.currency(code);
        let request = {
            'address': address, // only supports existing addresses in your withdraw address list
            'amount': amount,
            'currency': currency['id'].toLowerCase(),
        };
        if (tag !== undefined) {
            request['addr-tag'] = tag; // only for XRP?
        }
        let response = await this.privatePostDwWithdrawApiCreate(this.extend(request, params));
        let id = undefined;
        if ('data' in response) {
            id = response['data'];
        }
        return {
            'info': response,
            'id': id,
        };
    }

    sign(path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = '/';
        if (api === 'market') {
            url += api;
        } else if ((api === 'public') || (api === 'private')) {
            url += this.version;
        }
        url += '/' + this.implodeParams(path, params);
        let query = this.omit(params, this.extractParams(path));
        if (api === 'private') {
            this.checkRequiredCredentials();
            let timestamp = this.ymdhms(this.milliseconds(), 'T');
            let request = this.keysort(this.extend({
                'SignatureMethod': 'HmacSHA256',
                'SignatureVersion': '2',
                'AccessKeyId': this.apiKey,
                'Timestamp': timestamp,
            }, query));
            let auth = this.urlencode(request);
            // unfortunately, PHP demands double quotes for the escaped newline symbol
            // eslint-disable-next-line quotes
            let payload = [method, this.hostname, url, auth].join("\n");
            let signature = this.hmac(this.encode(payload), this.encode(this.secret), 'sha256', 'base64');
            auth += '&' + this.urlencode({ 'Signature': signature });
            url += '?' + auth;
            if (method === 'POST') {
                body = this.json(query);
                headers = {
                    'Content-Type': 'application/json',
                };
            } else {
                headers = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                };
            }
        } else {
            if (Object.keys(params).length)
                url += '?' + this.urlencode(params);
        }
        url = this.urls['api'][api] + url;
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors(httpCode, reason, url, method, headers, body, response) {
        if (typeof body !== 'string')
            return; // fallback to default error handler
        if (body.length < 2)
            return; // fallback to default error handler
        if ((body[0] === '{') || (body[0] === '[')) {
            if ('status' in response) {
                //
                //     {"status":"error","err-code":"order-limitorder-amount-min-error","err-msg":"limit order amount error, min: `0.001`","data":null}
                //
                let status = this.safeString(response, 'status');
                if (status === 'error') {
                    const code = this.safeString(response, 'err-code');
                    const feedback = this.id + ' ' + this.json(response);
                    const exceptions = this.exceptions;
                    if (code in exceptions) {
                        throw new exceptions[code](feedback);
                    }
                    throw new ExchangeError(feedback);
                }
            }
        }
    }

    async fetchDeposits(code = undefined, since = undefined, limit = undefined, params = {}) {
        if (code === undefined) {
            throw new ArgumentsRequired(this.id + ' fetchDeposits() requires a code argument');
        }
        if (limit === undefined || limit > 100) {
            limit = 100;
        }
        await this.loadMarkets();
        const request = {};
        let currency = this.currency(code);
        request['currency'] = currency['id'];
        request['type'] = 'deposit';
        request['from'] = 0; // From 'id' ... if you want to get results after a particular transaction id, pass the id in params.from
        request['size'] = limit; // Maximum transfers that can be fetched is 100
        let response = await this.privateGetQueryDepositWithdraw(this.extend(request, params));
        // return response
        return this.parseTransactions(response['data'], currency, since, limit);
    }

    async fetchWithdrawals(code = undefined, since = undefined, limit = undefined, params = {}) {
        if (code === undefined) {
            throw new ArgumentsRequired(this.id + ' fetchWithdrawals() requires a code argument');
        }
        if (limit === undefined || limit > 100) {
            limit = 100;
        }
        await this.loadMarkets();
        const request = {};
        let currency = this.currency(code);
        request['currency'] = currency['id'];
        request['type'] = 'withdraw'; // Huobi uses withdraw for withdrawals
        request['from'] = 0; // From 'id' ... if you want to get results after a particular Transaction id, pass the id in params.from
        request['size'] = limit; // Maximum transfers that can be fetched is 100
        let response = await this.privateGetQueryDepositWithdraw(this.extend(request, params));
        // return response
        return this.parseTransactions(response['data'], currency, since, limit);
    }

    parseTransaction(transaction, currency = undefined) {
        //
        // fetchDeposits
        //
        //     {
        //         'id': 8211029,
        //         'type': 'deposit',
        //         'currency': 'eth',
        //         'chain': 'eth',
        //         'tx-hash': 'bd315....',
        //         'amount': 0.81162421,
        //         'address': '4b8b....',
        //         'address-tag': '',
        //         'fee': 0,
        //         'state': 'safe',
        //         'created-at': 1542180380965,
        //         'updated-at': 1542180788077
        //     }
        //
        // fetchWithdrawals
        //
        //     {
        //         'id': 6908275,
        //         'type': 'withdraw',
        //         'currency': 'btc',
        //         'chain': 'btc',
        //         'tx-hash': 'c1a1a....',
        //         'amount': 0.80257005,
        //         'address': '1QR....',
        //         'address-tag': '',
        //         'fee': 0.0005,
        //         'state': 'confirmed',
        //         'created-at': 1552107295685,
        //         'updated-at': 1552108032859
        //     }
        //
        let timestamp = this.safeInteger(transaction, 'created-at');
        let updated = this.safeInteger(transaction, 'updated-at');
        let code = this.safeCurrencyCode(transaction, 'currency');
        let type = this.safeString(transaction, 'type');
        if (type === 'withdraw') {
            type = 'withdrawal';
        }
        let status = this.parseTransactionStatus(this.safeString(transaction, 'status'));
        let tag = this.safeString(transaction, 'address-tag');
        let feeCost = this.safeFloat(transaction, 'fee');
        if (feeCost !== undefined) {
            feeCost = Math.abs(feeCost);
        }
        return {
            'info': transaction,
            'id': this.safeString(transaction, 'id'),
            'txid': this.safeString(transaction, 'tx-hash'),
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'address': this.safeString(transaction, 'address'),
            'tag': tag,
            'type': type,
            'amount': this.safeFloat(transaction, 'amount'),
            'currency': code,
            'status': status,
            'updated': updated,
            'fee': {
                'currency': code,
                'cost': feeCost,
                'rate': undefined,
            },
        };
    }

    parseTransactionStatus(status) {
        let statuses = {
            // deposit statuses
            'unknown': 'failed',
            'confirming': 'pending',
            'confirmed': 'ok',
            'safe': 'ok',
            'orphan': 'failed',
            // withdrawal statuses
            'submitted': 'pending',
            'canceled': 'canceled',
            'reexamine': 'pending',
            'reject': 'failed',
            'pass': 'pending',
            'wallet-reject': 'failed',
            // 'confirmed': 'ok', // present in deposit statuses
            'confirm-error': 'failed',
            'repealed': 'failed',
            'wallet-transfer': 'pending',
            'pre-transfer': 'pending',
        };
        return this.safeString(statuses, status, status);
    }

    _websocketOnOpen(contextId, websocketConexConfig) {
        if (contextId === 'secure') {
            var authRequest = this.auth();
            this.websocketSendJson(authRequest, contextId);
        }
    }

    _websocketOnClose(contextId) {
        console.log(contextId + ': reconnect..');
        this.websocketRecoverConxid(contextId);
    }


    sign_sha(method, host, path, data) {
        var pars = [];

        for (let item in data) {
            pars.push(item + "=" + encodeURIComponent(data[item]));
        }

        var p = pars.sort().join("&");

        var meta = [method, host, path, p].join('\n');

        var hash = CryptoJS.HmacSHA256(meta, this.secret);
        var Signature = CryptoJS.enc.Base64.stringify(hash);
        return Signature;
    }



    auth() {
        // const timestamp = moment.utc().format('YYYY-MM-DDTHH:mm:ss');
        const timestamp = moment.utc().format('YYYY-MM-DDTHH:mm:ss');

        //let datestring = new Date().toISOString();
        //const timestamp = datestring.substring(0, datestring.length - 5);

        var data = {
            AccessKeyId: this.apiKey,
            SignatureMethod: "HmacSHA256",
            SignatureVersion: "2",
            Timestamp: timestamp,
        }

        var host = "api.huobi.pro";
        var uri = "/ws/v1";

        //计算签名
        data["Signature"] = this.sign_sha('GET', host, uri, data);
        data["op"] = "auth";
        return data;
    }

    _websocketOnMessage(contextId, data) {
        // TODO: pako function in Exchange.js/.py/.php
        // console.log(data);
        let text = this.gunzip(data);
        // text = pako.inflate (data, { 'to': 'string', });
        // console.log (text);
        let msg = JSON.parse(text);
        let ping = this.safeValue(msg, 'ping');
        let tick = this.safeValue(msg, 'tick');

        let op = this.safeValue(msg, 'op');

        if(op === "auth") {
            var err = this.safeInteger(msg, 'err-code');
            if (err === 0) {
                this.emit('authorized', true);
            } else {
                console.log('error auth:' + text);
            }
        }

        if(op === "notify") {
            this._websocketDispatchSecure(contextId, msg);
        }

        if(op === "ping") {
            const sendJson = {
                'op' : 'pong',
                ts: msg['ts']
            };
            this.websocketSendJson(sendJson,contextId);
        }

        if (typeof ping !== 'undefined') {
            // heartbeat ping-pong
            const sendJson = {
                'pong': msg['ping'],
            };
            this.websocketSendJson(sendJson,contextId);
        } else if (typeof tick !== 'undefined') {
            this._websocketDispatch(contextId, msg);
        }
    }

    _websocketParseTrade(trade, symbol) {
        // {'amount': 0.01, 'ts': 1551963266001, 'id': 10049953357926186872465, 'price': 3877.04, 'direction': 'sell'}
        let timestamp = this.safeInteger(trade, 'ts');
        return {
            'id': this.safeString(trade, 'id'),
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'symbol': symbol,
            'type': undefined,
            'side': this.safeString(trade, 'direction'),
            'price': this.safeFloat(trade, 'price'),
            'amount': this.safeFloat(trade, 'amount'),
        };
    }

    _websocketParseDetail(detail, symbol) {
        // {'amount': 0.01, 'ts': 1551963266001, 'id': 10049953357926186872465, 'price': 3877.04, 'direction': 'sell'}
        let timestamp = this.safeInteger(detail, 'ts');
        return {
            'id': this.safeString(detail, 'id'),
            'info': detail,
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'symbol': symbol,
            'open': this.safeFloat(detail, 'open'),
            'close': this.safeFloat(detail, 'close'),
            'high': this.safeFloat(detail, 'high'),
            'low': this.safeFloat(detail, 'low'),
            'amount': this.safeFloat(detail, 'amount'),
            'vol': this.safeFloat(detail, 'vol'),
            'count': this.safeFloat(detail, 'count'),
        };
    }

    _websocketDispatchSecure(contextId, data) {
        const topic = this.safeString(data, 'topic');
        const vals = topic.split('.');
        let tp = vals[0];

        if(tp === "orders") {
            var order = data["data"];
            order.timestamp = data.ts;
            const symbol = this.findSymbol(order.symbol);
            this.emit('orders', symbol, order);
        }

        if(tp === "accounts") {
            var b = data["data"];
            b.timestamp = data.ts;
            this.emit('balance', b);
        }
    }

    _websocketDispatch(contextId, data) {
        // console.log('received', data.ch, 'data.ts', data.ts, 'crawler.ts', moment().format('x'));
        const ch = this.safeString(data, 'ch');
        const vals = ch.split('.');
        let rawsymbol = vals[1];
        let channel = vals[2];
        // :symbol
        // const symbol = this.marketsById[rawsymbol].symbol;
        const symbol = this.findSymbol(rawsymbol);


        // let channel = data.ch.split('.')[2];
        if (channel === 'depth') {
            // :ob emit
            // console.log('ob', data.tick);
            // orderbook[symbol] = data.tick;
            const timestamp = this.safeValue(data, 'ts');
            const obdata = this.safeValue(data, 'tick');
            let ob = this.parseOrderBook(obdata, timestamp);
            let symbolData = this._contextGetSymbolData(contextId, 'ob', symbol);
            symbolData['ob'] = ob;
            this._contextSetSymbolData(contextId, 'ob', symbol, symbolData);
            // note, huobipro limit != depth
            this.emit('ob', symbol, this._cloneOrderBook(symbolData['ob'], symbolData['limit']));
        } else if (channel === 'trade') {
            // data:
            // {'ch': 'market.btchusd.trade.detail', 'ts': 1551962828309, 'tick': {'id': 100123237799, 'ts': 1551962828291, 'data': [{'amount': 0.435, 'ts': 1551962828291, 'id': 10012323779926186502443, 'price': 3871.72, 'direction': 'sell'}]}}
            let multiple_trades = data['tick']['data'];
            for (let i = 0; i < multiple_trades.length; i++) {
                let trade = this._websocketParseTrade(multiple_trades[i], symbol);
                this.emit('trade', symbol, trade);
            }
        } else if (channel === 'detail') {
            let detail = this._websocketParseDetail(data['tick'], symbol);
            this.emit('detail', symbol, detail);
        } 
        // TODO:kline
        // console.log('kline', data.tick);
    }

    _websocketSubscribe(contextId, event, symbol, nonce, params = {}) {
        if (event !== 'ob' && event !== 'trade' && event !== 'detail' && event !== 'orders' && event !== 'balance') {
            throw new NotSupported('subscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
        let ch = undefined;
        if (event === 'ob') {
            let data = this._contextGetSymbolData(contextId, event, symbol);
            // depth from 0 to 5
            // see https://github.com/huobiapi/API_Docs/wiki/WS_api_reference#%E8%AE%A2%E9%98%85-market-depth-%E6%95%B0%E6%8D%AE-marketsymboldepthtype
            let depth = this.safeInteger(params, 'depth', 2);
            data['depth'] = depth;
            // it is not limit
            data['limit'] = this.safeInteger(params, 'limit', 100);
            this._contextSetSymbolData(contextId, event, symbol, data);
            ch = '.depth.step' + depth.toString();
        } else if (event === 'trade') {
            ch = '.trade.detail';
        } else if (event === 'detail') {
            ch = '.detail';
        }

        if (event === "orders") {
            const sendJson = {
                'op': 'sub',
                'topic': 'orders.*.update'
            };
            this.websocketSendJson(sendJson, "secure");
        } else if (event === "balance") {
            const sendJson = {
                'op': 'sub',
                'topic': 'accounts'
            };
            this.websocketSendJson(sendJson, "secure");
        } else {
            const rawsymbol = this.marketId(symbol);
            const sendJson = {
                'sub': 'market.' + rawsymbol + ch,
                'id': rawsymbol,
            };
            this.websocketSendJson(sendJson);
        }

        let nonceStr = nonce.toString();
        this.emit(nonceStr, true);
    }

    _websocketUnsubscribe(contextId, event, symbol, nonce, params = {}) {
        if (event !== 'ob' && event !== 'trade' && event !== 'detail' && event !== 'orders') {
            throw new NotSupported('unsubscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
        let ch = undefined;
        if (event === 'ob') {
            let depth = this.safeInteger(params, 'depth', 2);
            ch = '.depth.step' + depth.toString();
        } else if (event === 'trade') {
            ch = '.trade.detail';
        } else if (event === 'detail') {
            ch = '.detail';
        }
        const rawsymbol = this.marketId(symbol);
        const sendJson = {
            'unsub': 'market.' + rawsymbol + ch,
            'id': rawsymbol,
        };

        if (event === "orders") {
            sendJson.sub = 'orders.' + rawsymbol + '.update';
        }

        this.websocketSendJson(sendJson);
        let nonceStr = nonce.toString();
        this.emit(nonceStr, true);
    }

    _getCurrentWebsocketOrderbook(contextId, symbol, limit) {
        let data = this._contextGetSymbolData(contextId, 'ob', symbol);
        if ('ob' in data && typeof data['ob'] !== 'undefined') {
            return this._cloneOrderBook(data['ob'], limit);
        }
        return undefined;
    }
};
