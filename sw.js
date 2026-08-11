/* =========================================================
   商品登録チェック
   Service Worker
   オフライン対応版 v6
========================================================= */


/* =========================================================
   キャッシュバージョン

   index.htmlを更新したため
   v5 → v6 に変更
========================================================= */

const CACHE_NAME = 'jan-checker-v6';


/* =========================================================
   オフラインで使用するファイル

   GitHub Pages：

   JANChecker/
   ├─ index.html
   ├─ manifest.json
   ├─ sw.js
   ├─ js/
   ├─ dict/
   └─ icons/

   の構成を想定
========================================================= */

const CACHE_FILES = [

    /* ----------------------------------------
       メインファイル
    ---------------------------------------- */

    './',
    './index.html',
    './manifest.json',


    /* ----------------------------------------
       JavaScript
    ---------------------------------------- */

    './js/quagga.min.js',
    './js/kuromoji.js',


    /* ----------------------------------------
       Kuromoji 辞書
    ---------------------------------------- */

    './dict/base.dat.gz',
    './dict/cc.dat.gz',
    './dict/check.dat.gz',

    './dict/tid.dat.gz',
    './dict/tid_map.dat.gz',
    './dict/tid_pos.dat.gz',

    './dict/unk.dat.gz',
    './dict/unk_char.dat.gz',
    './dict/unk_compat.dat.gz',
    './dict/unk_invoke.dat.gz',
    './dict/unk_map.dat.gz',
    './dict/unk_pos.dat.gz',


    /* ----------------------------------------
       PWAアイコン
    ---------------------------------------- */

    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png'

];


/* =========================================================
   Service Worker インストール
========================================================= */

self.addEventListener(
    'install',
    event => {

        console.log(
            '[Service Worker] Install:',
            CACHE_NAME
        );


        event.waitUntil(

            caches
                .open(
                    CACHE_NAME
                )
                .then(
                    cache => {

                        console.log(
                            '[Service Worker] Caching app files'
                        );


                        /*
                         * オフライン動作に必要なファイルを
                         * 一括でキャッシュ
                         */

                        return cache.addAll(
                            CACHE_FILES
                        );

                    }
                )
                .then(
                    () => {

                        console.log(
                            '[Service Worker] Cache completed'
                        );


                        /*
                         * 古いService Workerが終了するまで
                         * 待機せず、新版を有効化
                         */

                        return self.skipWaiting();

                    }
                )
                .catch(
                    error => {

                        console.error(
                            '[Service Worker] Install / Cache failed:',
                            error
                        );


                        /*
                         * エラーを再throwすることで
                         * 不完全なService Workerを
                         * インストール済みにしない
                         */

                        throw error;

                    }
                )

        );

    }
);


/* =========================================================
   Service Worker 有効化
========================================================= */

self.addEventListener(
    'activate',
    event => {

        console.log(
            '[Service Worker] Activate:',
            CACHE_NAME
        );


        event.waitUntil(

            caches
                .keys()
                .then(
                    cacheNames => {

                        /*
                         * 現在のv6以外の
                         * 古いキャッシュを削除
                         */

                        return Promise.all(

                            cacheNames.map(
                                cacheName => {

                                    if (
                                        cacheName !== CACHE_NAME
                                    ) {

                                        console.log(
                                            '[Service Worker] Delete old cache:',
                                            cacheName
                                        );


                                        return caches.delete(
                                            cacheName
                                        );

                                    }


                                    return Promise.resolve();

                                }
                            )

                        );

                    }
                )
                .then(
                    () => {

                        /*
                         * 現在開いているページを
                         * 新Service Workerの管理下へ
                         */

                        return self.clients.claim();

                    }
                )

        );

    }
);


/* =========================================================
   Fetch
========================================================= */

self.addEventListener(
    'fetch',
    event => {

        const request =
            event.request;


        /* ----------------------------------------
           GETリクエスト以外は処理しない
        ---------------------------------------- */

        if (
            request.method !== 'GET'
        ) {

            return;

        }


        /* ----------------------------------------
           URLを取得
        ---------------------------------------- */

        const url =
            new URL(
                request.url
            );


        /* ----------------------------------------
           HTTP / HTTPS以外は処理しない
        ---------------------------------------- */

        if (
            url.protocol !== 'http:' &&
            url.protocol !== 'https:'
        ) {

            return;

        }


        event.respondWith(

            caches
                .match(
                    request
                )
                .then(
                    cachedResponse => {

                        /* --------------------------------
                           キャッシュに存在する場合
                        -------------------------------- */

                        if (
                            cachedResponse
                        ) {

                            return cachedResponse;

                        }


                        /* --------------------------------
                           キャッシュに存在しない場合

                           ネットワークへアクセス
                        -------------------------------- */

                        return fetch(
                            request
                        )
                            .then(
                                networkResponse => {

                                    /*
                                     * レスポンスが存在しない場合
                                     */

                                    if (
                                        !networkResponse
                                    ) {

                                        return networkResponse;

                                    }


                                    /*
                                     * HTTP 200以外は
                                     * キャッシュしない
                                     */

                                    if (
                                        networkResponse.status !== 200
                                    ) {

                                        return networkResponse;

                                    }


                                    /*
                                     * opaqueレスポンスは
                                     * キャッシュ対象外
                                     */

                                    if (
                                        networkResponse.type === 'opaque'
                                    ) {

                                        return networkResponse;

                                    }


                                    /*
                                     * Responseは一度しか使用できないため
                                     * cloneを作成
                                     */

                                    const responseClone =
                                        networkResponse.clone();


                                    /*
                                     * ネットワークから取得したファイルを
                                     * 現在のキャッシュへ保存
                                     */

                                    caches
                                        .open(
                                            CACHE_NAME
                                        )
                                        .then(
                                            cache => {

                                                return cache.put(
                                                    request,
                                                    responseClone
                                                );

                                            }
                                        )
                                        .catch(
                                            error => {

                                                console.warn(
                                                    '[Service Worker] Dynamic cache failed:',
                                                    request.url,
                                                    error
                                                );

                                            }
                                        );


                                    return networkResponse;

                                }
                            )
                            .catch(
                                error => {

                                    console.warn(
                                        '[Service Worker] Network unavailable:',
                                        request.url,
                                        error
                                    );


                                    /* --------------------------------
                                       ページ遷移の場合

                                       オフライン時は
                                       index.htmlを表示
                                    -------------------------------- */

                                    if (
                                        request.mode === 'navigate'
                                    ) {

                                        return caches.match(
                                            './index.html'
                                        );

                                    }


                                    /* --------------------------------
                                       キャッシュにもネットにも
                                       ファイルが存在しない場合
                                    -------------------------------- */

                                    return new Response(
                                        'Offline',
                                        {
                                            status: 503,
                                            statusText: 'Offline',

                                            headers: {

                                                'Content-Type':
                                                    'text/plain; charset=UTF-8'

                                            }
                                        }
                                    );

                                }
                            );

                    }
                )

        );

    }
);


/* =========================================================
   Service Worker メッセージ処理
========================================================= */

self.addEventListener(
    'message',
    event => {

        /*
         * データが存在しない場合は終了
         */

        if (
            !event.data
        ) {

            return;

        }


        /*
         * index.html側から

         * {
         *     type: 'SKIP_WAITING'
         * }

         * が送信された場合、
         * 新Service Workerを即時有効化
         */

        if (
            event.data.type === 'SKIP_WAITING'
        ) {

            console.log(
                '[Service Worker] SKIP_WAITING received'
            );


            self.skipWaiting();

        }

    }
);
