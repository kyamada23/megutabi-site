/* めぐたび公開サイトのナッジ体験（PBI-94）。
 *
 * 「過去の旅を選ぶと、自分はすでにけっこう埋まっていると気づく」というアプリの
 * 中核体験（docs/ux-flows.md §1）を、インストール前に10〜30秒だけ疑似体験させる。
 * 2つの独立した機能を1ファイルにまとめている（18本の記事にインラインスクリプトを
 * 複製しないため、analytics.js と同じく defer 読み込みの共有ファイルにする）。
 *
 *   1. initThemeTable() — テーマ記事の一覧表。行をタップすると「行った」を
 *      記録し、残数に応じて進捗の一行と記事内CTAの文言を切り替える。
 *      残り3か所以上のときは「あとN か所」を出さない（目標勾配はゴールが
 *      近いときしか効かないため）。
 *   2. initLpQuiz()     — LP のミニ診断。9件のスポットから選ぶと、該当テーマの
 *      進み具合を返す。テーマ名は選択結果としてはじめて明かす（テーマ名を
 *      先に出すとただのチェックリストになり、「あの場所、実はこのテーマの
 *      ひとつだった」という気づきが起きない）。
 *
 * どちらも送信・保存を一切しない（選択状態はページ内のメモリにのみ持つ。
 * プライバシーポリシーの「サイトをまたいだ行動の追跡は行わない」と整合させる）。
 * JS が動かない環境では、テーブルは現状の静的な表のまま、LP診断は
 * <noscript> の案内文だけが残る（PBI-86 の screens-hint と同じ方針）。
 *
 * 選択の見た目は実際の <input type="checkbox"> にする（accent-color で着色）。
 * カスタム描画の疑似チェックボックスにしないのは、キーボード操作・スクリーン
 * リーダーの状態通知をブラウザ標準に任せられるため。タップ領域は行／パネル
 * 全体にする（チェックボックス自体は小さく、単体では押しにくいため）。
 */
(function () {
  "use strict";

  // 記事の行・LP のパネルが共有するチェックボックス生成（見た目の統一）。
  function createSpotCheckbox(labelText) {
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "spot-check";
    checkbox.setAttribute("aria-label", labelText + "を訪問済みにする");
    return checkbox;
  }

  function initThemeTable() {
    var table = document.querySelector(".theme-table");
    if (!table) {
      return;
    }
    var rows = table.querySelectorAll("tbody tr");
    if (!rows.length) {
      return;
    }

    var themeCount = table.getAttribute("data-theme-count") || "";
    var ctaTextEl = document.querySelector("#get-app .cta-inline-text");
    var ctaOriginal = ctaTextEl ? ctaTextEl.innerHTML : null;

    var n = rows.length;

    var progress = document.createElement("p");
    progress.className = "check-progress status-line";
    progress.setAttribute("role", "status");
    progress.setAttribute("aria-live", "polite");
    var scrollWrap = table.closest(".table-scroll") || table.parentNode;
    scrollWrap.parentNode.insertBefore(progress, scrollWrap.nextSibling);

    function render() {
      // DOM の checked 状態から都度数える（手動カウンタを持たない。
      // カウンタ加減算の呼び忘れで実際のチェック数と静かにずれる心配がない）。
      var visited = table.querySelectorAll(".spot-check:checked").length;
      var remaining = n - visited;

      if (visited === 0) {
        progress.textContent = "";
        if (ctaTextEl) {
          ctaTextEl.innerHTML = ctaOriginal;
        }
        return;
      }

      // 残り3か所以上: 得たものだけを言う。「あとN か所」は出さない
      // （目標勾配は「ゴールが近い」ときだけ効くため、遠い残数は逆効果）。
      if (remaining >= 3) {
        progress.textContent = visited + " か所、記録済み。";
        if (ctaTextEl) {
          ctaTextEl.innerHTML = ctaOriginal;
        }
        return;
      }

      // 残り1〜2か所: ここで初めて踏破を持ち出す。CTA も残数に連動する。
      if (remaining >= 1) {
        progress.innerHTML =
          visited + " / " + n + " か所。<strong>あと " + remaining + " か所で踏破です。</strong>";
        if (ctaTextEl) {
          ctaTextEl.textContent = "残り " + remaining + " か所をアプリで記録する";
        }
        return;
      }

      // 全選択: 完結させず、分母（全テーマ数）に引き渡して未完了を保つ。
      progress.innerHTML = "<strong>" + n + " か所すべて記録済み。踏破です。</strong>";
      if (themeCount) {
        progress.innerHTML += " 全" + themeCount + "のテーマのうち、その1つです。";
      }
      if (ctaTextEl) {
        ctaTextEl.textContent = "アプリで、ほかのテーマもめぐる";
      }
    }

    rows.forEach(function (row) {
      var cell = row.cells[0];
      if (!cell) {
        return;
      }
      var checkbox = createSpotCheckbox(cell.textContent);
      cell.insertBefore(checkbox, cell.firstChild);
      row.classList.add("is-checkable");

      function onChange() {
        row.classList.toggle("is-visited", checkbox.checked);
        render();
      }

      // タップ領域は行全体。チェックボックス自身への click はここで拾わず
      // （native の change に任せる）、二重トグルを避ける。見どころ列には
      // テーマ間の内部リンク（[[slug|text]]）が入ることがあるため、リンクの
      // クリックも素通りさせる（じゃないとリンクを新規タブで開いただけで
      // 行が「訪問済み」になってしまう）。
      row.addEventListener("click", function (e) {
        if (e.target === checkbox || e.target.closest("a")) {
          return;
        }
        checkbox.checked = !checkbox.checked;
        onChange();
      });
      checkbox.addEventListener("change", onChange);
    });

    render();
  }

  function initLpQuiz() {
    var root = document.getElementById("lp-quiz");
    var dataEl = document.getElementById("lp-quiz-data");
    var grid = document.getElementById("lp-quiz-grid");
    var resultEl = document.getElementById("lp-quiz-result");
    if (!root || !dataEl || !grid || !resultEl) {
      return;
    }

    var spots;
    try {
      spots = JSON.parse(dataEl.textContent);
    } catch (err) {
      // 生成物であれば本来起きない（build_theme_pages.py が壊れた形では
      // 出力しない）。万一 index.html の手編集で壊れても、コンソールに
      // 手がかりを残す（黙って空白のセクションになるのを避ける）。
      window.console && console.error("checklist.js: lp-quiz-data の解析に失敗しました", err);
      return;
    }
    if (!spots || !spots.length) {
      return;
    }

    var picked = {};

    function render() {
      var byTheme = {};
      var totals = {};
      spots.forEach(function (spot, i) {
        totals[spot.theme] = spot.total;
        if (!picked[i]) {
          return;
        }
        byTheme[spot.theme] = (byTheme[spot.theme] || 0) + 1;
      });
      var names = Object.keys(byTheme);
      if (!names.length) {
        resultEl.textContent = "";
        return;
      }
      // 選択が0のテーマは一切出さない（テーマ名を隠す設計の核）。
      // 各テーマの構成数（total）は埋め込み JSON から読む。ハードコードの
      // 定数にしないのは、レジストリ側の構成数と食い違って「あと1か所」を
      // 誤表示する事態を防ぐため。
      var parts = names.map(function (t) {
        var k = byTheme[t];
        var total = totals[t];
        if (k >= total) {
          return t + "は踏破です。";
        }
        return t + "は、あと " + (total - k) + " か所。";
      });
      resultEl.textContent = parts.join("　");
    }

    spots.forEach(function (spot, i) {
      var label = document.createElement("label");
      label.className = "lp-quiz-panel";

      var checkbox = createSpotCheckbox(spot.name);

      var text = document.createElement("span");
      text.className = "lp-quiz-panel-text";

      var name = document.createElement("span");
      name.className = "lp-quiz-panel-name";
      name.textContent = spot.name;

      var pref = document.createElement("span");
      pref.className = "lp-quiz-panel-pref";
      pref.textContent = spot.pref;

      text.appendChild(name);
      text.appendChild(pref);
      label.appendChild(checkbox);
      label.appendChild(text);
      grid.appendChild(label);

      checkbox.addEventListener("change", function () {
        picked[i] = checkbox.checked;
        label.classList.toggle("is-checked", checkbox.checked);
        render();
      });
    });

    // <label> がチェックボックスを内包するため、タップ領域は自然にパネル
    // 全体になる（記事側のように click 委譲を自前で書く必要がない）。
    root.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", function () {
    initThemeTable();
    initLpQuiz();
  });
})();
