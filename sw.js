/* ========================================
   商品登録チェック
   Service Worker
======================================== */

/*
 * キャッシュのバージョン
 *
 * 今後アプリを大きく更新したときは
 * v1 → v2 → v3
 * のように変更する
 */
const CACHE_NAME = 'product-checker-v1';


/*
 * オフラインでも使用したいファイル
 */
const APP_FILES = [
    './',
    './index.html',
    './manifest.json',

    './js/quagga.min.js',

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

                    console.log(
                        'オフライン用ファイルをキャッシュします'
                    );

                    return cache.addAll(
                        APP_FILES
                    );

                })

                .then(() => {

                    /*
                     * 新しいService Workerを
                     * すぐ待機状態から進める
                     */
                    return self.skipWaiting();

                })

        );

    }
);


/* ========================================
   有効化
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

                                /*
                                 * 古いバージョンの
                                 * キャッシュを削除
                                 */
                                if (
                                    cacheName !== CACHE_NAME &&
                                    cacheName.startsWith(
                                        'product-checker-'
                                    )
                                ) {

                                    console.log(
                                        '古いキャッシュを削除:',
                                        cacheName
                                    );

                                    return caches.delete(
                                        cacheName
                                    );

                                }

                            }
                        )

                    );

                })

                .then(() => {

                    /*
                     * 開いているページを
                     * 新しいService Workerで
                     * すぐ制御する
                     */
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
         * 外部サイトへのアクセス
         * =====================================
         *
         * URL連携などは通常のネット通信へ任せる。
         *
         * つまり、
         *
         * オンライン
         * → URL連携使用可能
         *
         * オフライン
         * → URL連携使用不可
         *
         * という動きになる。
         */
        if (
            requestUrl.origin !==
            self.location.origin
        ) {

            return;

        }


        /*
         * =====================================
         * ページそのものを開いた場合
         * =====================================
         */
        if (
            request.mode === 'navigate'
        ) {

            event.respondWith(

                fetch(request)

                    .then(response => {

                        /*
                         * オンラインなら
                         * 最新ページを取得
                         */
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


                        return response;

                    })

                    .catch(() => {

                        /*
                         * 圏外なら
                         * 保存済みindex.htmlを使用
                         */
                        return caches.match(
                            './index.html'
                        );

                    })

            );


            return;

        }


        /*
         * =====================================
         * JS / manifest / アイコン等
         * =====================================
         *
         * まずキャッシュを探す。
         *
         * 見つからなければネットから取得。
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


                    return fetch(
                        request
                    );

                })

        );

    }
);
