/* めぐたび公開サイトのアクセス解析。
 *
 * Cloudflare Web Analytics（Cookie を使わず、個人を識別する情報も保存しない）。
 * アプリ本体に分析を入れない方針（ADR 0003）は維持し、計測は公開サイト側だけで行う。
 *
 * トークンの差し替えはこのファイル 1 箇所で完結する。全ページはこのファイルを
 * defer 読み込みするだけなので、解析ツールを乗り換えるときもここを書き換える。
 *
 * トークンの取得: Cloudflare ダッシュボード → Web Analytics → サイトを追加
 * → 発行された JS スニペット内の token 値。クライアント側 JS に埋まる公開値
 * なので、秘密情報として扱う必要はない。
 *
 * 登録しているホスト名は kyamada23.github.io。Web Analytics はホスト名単位で
 * サイトを識別するため、独自ドメインへ移行するとき（PBI-88）は新ホスト名で
 * 登録し直してトークンを差し替える。過去データは引き継がれない。
 *
 * 未設定（プレースホルダのまま）のときは何も読み込まない。設定し忘れたまま
 * publish しても、無効なトークンでビーコンを撃ち続けることがないようにしている。
 */
(function () {
  "use strict";

  var TOKEN = "58e130d7e8dd4d4e910e5d9ec3d84ae9";

  if (TOKEN.indexOf("REPLACE_WITH_") === 0) {
    return;
  }

  var s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.setAttribute("data-cf-beacon", JSON.stringify({ token: TOKEN }));
  document.head.appendChild(s);
})();
