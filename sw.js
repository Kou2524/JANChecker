/* ========================================
   商品登録チェック
   Service Worker v3
======================================== */

const CACHE_NAME = 'product-checker-v4';

/*
 * 完全オフラインでも必要なアプリ本体。
 * URL連携先などの外部通信はキャッシュ対象外。
 */
const APP_FILES = [
    './',
    './index.html',
    './manifest.json',
    './js/quagga.min.js',
    './js/quagga.min.js?v=3',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png'
];


/* ========================================
   インストール
======================================== */

self.addEventListener(
    'install',
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(cache => {

                    return cache.addAll(
                        APP_FILES
                    );

                })
                .then(() => {

                    return self.skipWaiting();

                })

        );

    }
);


/* ========================================
   有効化・旧キャッシュ削除
======================================== */

self.addEventListener(
    'activate',
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(cacheNames => {

                    return Promise.all(

                        cacheNames.map(
                            cacheName => {

                                if (
                                    cacheName !== CACHE_NAME &&
                                    cacheName.startsWith(
                                        'product-checker-'
                                    )
                                ) {

                                    return caches.delete(
                                        cacheName
                                    );

                                }

                            }
                        )

                    );

                })
                .then(() => {

                    return self.clients.claim();

                })

        );

    }
);


/* ========================================
   通信処理
======================================== */

self.addEventListener(
    'fetch',
    event => {

        const request =
            event.request;


        /*
         * GET以外はService Workerで処理しない
         */
        if (
            request.method !== 'GET'
        ) {

            return;

        }


        const requestUrl =
            new URL(
                request.url
            );


        /*
         * =====================================
         * 外部通信
         * =====================================
         *
         * URL連携やCDNなど、
         * GitHub Pages以外への通信は
         * 通常のネット通信に任せる。
         */
        if (
            requestUrl.origin !==
            self.location.origin
        ) {

            return;

        }


        /*
         * =====================================
         * HTMLページ
         * =====================================
         *
         * Network First
         *
         * オンライン
         * → 最新のindex.htmlを取得
         *
         * オフライン
         * → キャッシュ済みindex.htmlを使用
         */
        if (
            request.mode === 'navigate'
        ) {

            event.respondWith(

                fetch(request)
                    .then(response => {

                        if (
                            response &&
                            response.ok
                        ) {

                            const copy =
                                response.clone();


                            caches
                                .open(CACHE_NAME)
                                .then(cache => {

                                    cache.put(
                                        './index.html',
                                        copy
                                    );

                                });

                        }


                        return response;

                    })
                    .catch(() => {

                        return caches.match(
                            './index.html'
                        );

                    })

            );


            return;

        }


        /*
         * =====================================
         * JS / manifest / アイコン
         * =====================================
         *
         * Cache First
         *
         * ① キャッシュ確認
         * ② なければネット取得
         * ③ 取得できたものをキャッシュ
         */
        event.respondWith(

            caches
                .match(request)
                .then(cachedResponse => {

                    if (
                        cachedResponse
                    ) {

                        return cachedResponse;

                    }


                    return fetch(request)
                        .then(response => {

                            if (
                                !response ||
                                !response.ok
                            ) {

                                return response;

                            }


                            const copy =
                                response.clone();


                            caches
                                .open(CACHE_NAME)
                                .then(cache => {

                                    cache.put(
                                        request,
                                        copy
                                    );

                                });


                            return response;

                        });

                })

        );

    }
);
