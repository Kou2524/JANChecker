/* =========================================================
   商品登録チェック
   Service Worker
   オフライン対応版 v5
========================================================= */

const CACHE_NAME = 'jan-checker-v5';


/* =========================================================
   オフラインで使用するファイル

   ※ GitHub Pages の
      JANChecker/
   をルートとして想定
========================================================= */

const CACHE_FILES = [

    /* ----------------------------------------
       メイン
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
       アイコン
    ---------------------------------------- */

    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png'

];


/* =========================================================
   インストール

   必要なファイルを端末へキャッシュする
========================================================= */

self.addEventListener(
    'install',
    event => {

        console.log(
            '[Service Worker] Install'
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


                        return cache.addAll(
                            CACHE_FILES
                        );

                    }
                )
                .then(
                    () => {

                        /*
                         * 新しいService Workerを
                         * 待機状態にせず即時有効化
                         */

                        return self.skipWaiting();

                    }
                )

        );

    }
);


/* =========================================================
   アクティベート

   古いキャッシュを削除する
========================================================= */

self.addEventListener(
    'activate',
    event => {

        console.log(
            '[Service Worker] Activate'
        );


        event.waitUntil(

            caches
                .keys()
                .then(
                    cacheNames => {

                        return Promise.all(

                            cacheNames.map(
                                cacheName => {

                                    /*
                                     * 現在使用しているキャッシュ以外を削除
                                     */

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
                         * 開いているページを
                         * 即座に新Service Workerの管理下へ
                         */

                        return self.clients.claim();

                    }
                )

        );

    }
);


/* =========================================================
   Fetch

   基本動作：

   1. キャッシュを確認
   2. あればキャッシュを返す
   3. なければネットワークへアクセス
   4. 成功したデータはキャッシュへ追加

   → オフラインでも動作可能
========================================================= */

self.addEventListener(
    'fetch',
    event => {

        const request =
            event.request;


        /*
         * GET以外はキャッシュ処理しない
         */

        if (
            request.method !== 'GET'
        ) {

            return;

        }


        /*
         * http / https 以外は処理しない
         */

        const url =
            new URL(
                request.url
            );


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

                        /*
                         * キャッシュが存在する場合
                         */

                        if (
                            cachedResponse
                        ) {

                            return cachedResponse;

                        }


                        /*
                         * キャッシュに無ければ
                         * ネットワークへアクセス
                         */

                        return fetch(
                            request
                        )
                            .then(
                                networkResponse => {

                                    /*
                                     * 正常レスポンス以外は
                                     * キャッシュしない
                                     */

                                    if (
                                        !networkResponse ||
                                        networkResponse.status !== 200
                                    ) {

                                        return networkResponse;

                                    }


                                    /*
                                     * opaqueレスポンスは
                                     * 原則キャッシュ対象外
                                     */

                                    if (
                                        networkResponse.type === 'opaque'
                                    ) {

                                        return networkResponse;

                                    }


                                    /*
                                     * レスポンスは一度しか読めないため
                                     * cloneしてキャッシュへ保存
                                     */

                                    const responseClone =
                                        networkResponse.clone();


                                    caches
                                        .open(
                                            CACHE_NAME
                                        )
                                        .then(
                                            cache => {

                                                cache.put(
                                                    request,
                                                    responseClone
                                                );

                                            }
                                        );


                                    return networkResponse;

                                }
                            )
                            .catch(
                                error => {

                                    console.warn(
                                        '[Service Worker] Offline fetch failed:',
                                        request.url,
                                        error
                                    );


                                    /*
                                     * HTMLページへのアクセスだった場合は
                                     * index.htmlへフォールバック
                                     */

                                    if (
                                        request.mode === 'navigate'
                                    ) {

                                        return caches.match(
                                            './index.html'
                                        );

                                    }


                                    /*
                                     * その他のファイルで
                                     * キャッシュにもネットにも無ければ
                                     * エラーを返す
                                     */

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
   メッセージ受信

   index.htmlなどから

   navigator.serviceWorker.controller.postMessage({
       type: 'SKIP_WAITING'
   });

   と送れば即時更新できる
========================================================= */

self.addEventListener(
    'message',
    event => {

        if (
            !event.data
        ) {

            return;

        }


        if (
            event.data.type === 'SKIP_WAITING'
        ) {

            console.log(
                '[Service Worker] Skip waiting requested'
            );


            self.skipWaiting();

        }

    }
);
