'use strict';

// ---------------------------------------------------------------------------

const huobipro = require ('./huobipro.js');

// ---------------------------------------------------------------------------

module.exports = class huobiru extends huobipro {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'huobikorea',
            'name': 'Huobi Korea',
            'countries': [ 'KO' ],
            'hostname': 'api-cloud.huobi.co.kr',
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/52978816-e8552e00-33e3-11e9-98ed-845acfece834.jpg',
                'api': {
                    'market': 'https://api-cloud.huobi.co.kr',
                    'public': 'https://api-cloud.huobi.co.kr',
                    'private': 'https://api-cloud.huobi.co.kr',
                    'zendesk': 'https://huobiglobal.zendesk.com/hc/en-us/articles',
                },
                'www': 'https://www.huobi.co.kr',
                'referral': 'https://www.huobi.co.kr/invite?invite_code=esc74',
                'doc': 'https://github.com/cloudapidoc/API_Docs_en',
                'fees': 'https://www.huobi.co.kr/about/fee/',
            },
            'wsconf': {
                'conx-tpls': {
                    'default': {
                        'type': 'ws',
                        'baseurl': 'wss://api-cloud.huobi.co.kr/ws',
                    },
                    'secure': {
                        'type': 'ws',
                        'baseurl': 'wss://api-cloud.huobi.co.kr/ws/v1',
                        'private': true,
                        'wait4readyEvent': 'authorized'
                    }
                },
            },
        });
    }
};
