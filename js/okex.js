'use strict';

// ---------------------------------------------------------------------------

const okcoinusd = require ('./okcoinusd.js');
const { ExchangeError, NotSupported } = require ('./base/errors');

// ---------------------------------------------------------------------------

module.exports = class okex extends okcoinusd {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'okex',
            'name': 'OKEX',
            'countries': ['CN', 'US'],
            'has': {
                'CORS': false,
                'futures': true,
                'fetchTickers': true,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/32552768-0d6dd3c6-c4a6-11e7-90f8-c043b64756a7.jpg',
                'api': {
                    'web': 'https://www.okex.com/v2',
                    'public': 'https://www.okex.com/api',
                    'private': 'https://www.okex.com/api',
                },
                'www': 'https://www.okex.com',
                'doc': [
                    'https://github.com/okcoin-okex/API-docs-OKEx.com',
                    'https://www.okex.com/docs/en/',
                ],
                'fees': 'https://www.okex.com/pages/products/fees.html',
            },
            'fees': {
                'trading': {
                    'taker': 0.0015,
                    'maker': 0.0010,
                },
                'spot': {
                    'taker': 0.0015,
                    'maker': 0.0010,
                },
                'future': {
                    'taker': 0.0030,
                    'maker': 0.0020,
                },
                'swap': {
                    'taker': 0.0070,
                    'maker': 0.0020,
                },
            },
            'commonCurrencies': {
                // OKEX refers to ERC20 version of Aeternity (AEToken)
                'AE': 'AET', // https://github.com/ccxt/ccxt/issues/4981
                'FAIR': 'FairGame',
                'HOT': 'Hydro Protocol',
                'HSR': 'HC',
                'MAG': 'Maggie',
                'YOYO': 'YOYOW',
            },
            'wsconf': {
                'conx-tpls': {
                    'default': {
                        'type': 'ws',
                        'baseurl': 'wss://real.okex.com:10441/websocket',
                    },
                },
                'methodmap': {
                    'addChannel': '_websocketOnAddChannel',
                    'removeChannel': '_websocketOnRemoveChannel',
                    '_websocketSendHeartbeat': '_websocketSendHeartbeat',
                },
                'events': {
                    'ob': {
                        'conx-tpl': 'default',
                        'conx-param': {
                            'url': '{baseurl}',
                            'id': '{id}',
                        },
                    },
                },
            },
        });
    }

    _websocketOnOpen (contextId, params) {
        // : heartbeat
        // this._websocketHeartbeatTicker && clearInterval (this._websocketHeartbeatTicker);
        // this._websocketHeartbeatTicker = setInterval (() => {
        //      this.websocketSendJson ({
        //        'event': 'ping',
        //    });
        //  }, 30000);
        let heartbeatTimer = this._contextGet (contextId, 'heartbeattimer');
        if (typeof heartbeatTimer !== 'undefined') {
            this._cancelTimer (heartbeatTimer);
        }
        heartbeatTimer = this._setTimer (contextId, 30000, this._websocketMethodMap ('_websocketSendHeartbeat'), [contextId]);
        this._contextSet (contextId, 'heartbeattimer', heartbeatTimer);
    }

    _websocketSendHeartbeat (contextId) {
        this.websocketSendJson (
            {
                'event': 'ping',
            },
            contextId
        );
    }

    websocketClose (conxid = 'default') {
        super.websocketClose (conxid);
        // stop heartbeat ticker
        // this._websocketHeartbeatTicker && clearInterval (this._websocketHeartbeatTicker);
        // this._websocketHeartbeatTicker = null;
        let heartbeatTimer = this._contextGet (conxid, 'heartbeattimer');
        if (typeof heartbeatTimer !== 'undefined') {
            this._cancelTimer (heartbeatTimer);
        }
        this._contextSet (conxid, 'heartbeattimer', undefined);
    }

    _websocketOnAddChannel () {
        return undefined;
    }

    _websocketOnRemoveChannel () {
        return undefined;
    }

    _websocketOnChannel (contextId, channel, msg, data) {
        // console.log('========================',msg);
        if (channel.indexOf ('ok_sub_spot_') >= 0) {
            // spot
            const depthIndex = channel.indexOf ('_depth');
            if (depthIndex > 0) {
                // orderbook
                let result = this.safeValue (data, 'result', undefined);
                if (typeof result !== 'undefined' && !result) {
                    let error = new ExchangeError (this.safeString (data, 'error_msg', 'orderbook error'));
                    this.emit ('err', error);
                    return;
                }
                let channelName = channel.replace ('ok_sub_spot_', '');
                let parts = channelName.split ('_depth');
                const pair = parts[0];
                const symbol = this._getSymbolByPair (pair);
                let timestamp = this.safeValue (data, 'timestamp');
                let ob = this.parseOrderBook (data, timestamp);
                let symbolData = this._contextGetSymbolData (
                    contextId,
                    'ob',
                    symbol
                );
                symbolData['ob'] = ob;
                this._contextSetSymbolData (contextId, 'ob', symbol, symbolData);
                this.emit (
                    'ob',
                    symbol,
                    this._cloneOrderBook (symbolData['ob'], symbolData['depth'])
                );
            }
        } else if (channel.indexOf ('ok_sub_future') >= 0) {
            // future
            const depthIndex = channel.indexOf ('_depth');
            if (depthIndex > 0) {
                // orderbook
                const pair = channel.substring (
                    'ok_sub_future'.length,
                    depthIndex
                );
                const symbol = this._getSymbolByPair (pair, true);
                let timestamp = data.timestamp;
                let ob = this.parseOrderBook (data, timestamp);
                let symbolData = this._contextGetSymbolData (
                    contextId,
                    'ob',
                    symbol
                );
                symbolData['ob'] = ob;
                this._contextSetSymbolData (contextId, 'ob', symbol, symbolData);
                this.emit (
                    'ob',
                    symbol,
                    this._cloneOrderBook (symbolData['ob'], symbolData['depth'])
                );
            }
        }
    }

    _websocketDispatch (contextId, msg) {
        // _websocketOnMsg [{"binary":0,"channel":"addChannel","data":{"result":true,"channel":"ok_sub_spot_btc_usdt_depth"}}] default
        // _websocketOnMsg [{"binary":0,"channel":"ok_sub_spot_btc_usdt_depth","data":{"asks":[[
        let channel = this.safeString (msg, 'channel');
        if (!channel) {
            // pong
            return;
        }
        let resData = this.safeValue (msg, 'data', {});
        if (channel in this.wsconf['methodmap']) {
            let method = this.wsconf['methodmap'][channel];
            this[method] (channel, msg, resData, contextId);
        } else {
            this._websocketOnChannel (contextId, channel, msg, resData);
        }
    }

    _websocketOnMessage (contextId, data) {
        // console.log ('_websocketOnMsg', data);
        let msgs = JSON.parse (data);
        if (Array.isArray (msgs)) {
            for (let i = 0; i < msgs.length; i++) {
                this._websocketDispatch (contextId, msgs[i]);
            }
        } else {
            this._websocketDispatch (contextId, msgs);
        }
    }

    _websocketSubscribe (contextId, event, symbol, nonce, params = {}) {
        if (event !== 'ob') {
            throw new NotSupported ('subscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
        let data = this._contextGetSymbolData (contextId, event, symbol);
        data['depth'] = params['depth'];
        data['limit'] = params['depth'];
        this._contextSetSymbolData (contextId, event, symbol, data);
        const sendJson = {
            'event': 'addChannel',
            'channel': this._getOrderBookChannelBySymbol (symbol, params),
        };
        this.websocketSendJson (sendJson);
        let nonceStr = nonce.toString ();
        this.emit (nonceStr, true);
    }

    _websocketUnsubscribe (contextId, event, symbol, nonce, params = {}) {
        if (event !== 'ob') {
            throw new NotSupported ('subscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
        const sendJson = {
            'event': 'removeChannel',
            'channel': this._getOrderBookChannelBySymbol (symbol, params),
        };
        this.websocketSendJson (sendJson);
        let nonceStr = nonce.toString ();
        this.emit (nonceStr, true);
    }

    _getOrderBookChannelBySymbol (symbol, params = {}) {
        const pair = this._getPairBySymbol (symbol);
        // future example:ok_sub_futureusd_btc_depth_this_week_20
        // ok_sub_spot_usdt_btc_depth
        // spot ewxample:ok_sub_spot_btc_usdt_depth_5
        let depthParam = this.safeString (params, 'depth', '');
        // becareful of the underscore
        if (depthParam) {
            depthParam = '_' + depthParam;
        }
        let channel = 'ok_sub_spot_' + pair + '_depth' + depthParam;
        if (this._isFutureSymbol (symbol)) {
            const contract_type = params.contract_type;
            if (!contract_type) {
                throw new ExchangeError ('parameter contract_type is required for the future.');
            }
            channel = 'ok_sub_future' + pair + '_depth_' + contract_type + depthParam;
        }
        return channel;
    }

    _getPairBySymbol (symbol) {
        let [currencyBase, currencyQuote] = symbol.split ('/');
        currencyBase = currencyBase.toLowerCase ();
        currencyQuote = currencyQuote.toLowerCase ();
        let pair = currencyBase + '_' + currencyQuote;
        if (this._isFutureSymbol (symbol)) {
            pair = currencyQuote + '_' + currencyBase;
        }
        return pair;
    }

    _getSymbolByPair (pair, isFuture = false) {
        let [currency1, currency2] = pair.split ('_');
        currency1 = currency1.toUpperCase ();
        currency2 = currency2.toUpperCase ();
        let symbol = isFuture ? currency2 + '/' + currency1 : currency1 + '/' + currency2;
        return symbol;
    }

    _getCurrentWebsocketOrderbook (contextId, symbol, limit) {
        let data = this._contextGetSymbolData (contextId, 'ob', symbol);
        if ('ob' in data && typeof data['ob'] !== 'undefined') {
            return this._cloneOrderBook (data['ob'], limit);
        }
        return undefined;
    }
};
